import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSuiClient, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Header } from '@/components/layout/Header';
import { SealClient, SessionKey, type ExportedSessionKey, EncryptedObject, NoAccessError } from '@mysten/seal';
import { fromHex } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { get, set } from 'idb-keyval';

interface AllowlistViewerProps {
  allowlistId: string;
  onNavigateToAuth: () => void;
  onNavigateToLanding: () => void;
}

interface FeedData {
  allowlistId: string;
  allowlistName: string;
  blobIds: string[];
}

interface DecryptedFile {
  url: string;
  filename: string;
  contentType: string;
}

const TESTNET_PACKAGE_ID = '0xc5ce2742cac46421b62028557f1d7aea8a4c50f651379a79afdf12cd88628807';
const SERVER_OBJECT_IDS = [
  "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", 
  "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8"
];
const TTL_MIN = 10;

type MoveCallConstructor = (tx: Transaction, id: string) => void;


export const AllowlistViewer: React.FC<AllowlistViewerProps> = ({
  allowlistId,
  onNavigateToAuth,
  onNavigateToLanding,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [decryptedFiles, setDecryptedFiles] = useState<DecryptedFile[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showDecryptedFiles, setShowDecryptedFiles] = useState(false);

  // Sui and SEAL setup
  const suiClient = useSuiClient();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  // Ensure SealClient receives a suiClient with expected `core` methods
  const wrapForSeal = (client: any) => {
    const wrapped = { ...client };
    const core: any = { ...(client?.core || {}) };

    if (typeof core.getMoveFunction !== 'function') {
      core.getMoveFunction = async (keys: any) => {
        if (Array.isArray(keys)) {
          const results = await Promise.all(
            keys.map((key: any) => {
              if (key && typeof key === 'object' && !Array.isArray(key)) {
                const pkg = String(key.package ?? key.packageId ?? '');
                const mod = String(key.module ?? key.moduleName ?? '');
                const fn = String(key.function ?? key.functionName ?? '');
                if (!pkg || !mod || !fn) return Promise.resolve(null);
                return client
                  .getNormalizedMoveFunction({ package: pkg, module: mod, function: fn })
                  .catch(() => null);
              }
              if (Array.isArray(key)) {
                const [pkg, mod, fn] = key;
                if (!pkg || !mod || !fn) return Promise.resolve(null);
                return client
                  .getNormalizedMoveFunction({ package: String(pkg), module: String(mod), function: String(fn) })
                  .catch(() => null);
              }
              return Promise.resolve(null);
            })
          );
          return results;
        }

        if (keys && typeof keys === 'object' && !Array.isArray(keys)) {
          const pkg = String((keys as any).package ?? (keys as any).packageId ?? '');
          const mod = String((keys as any).module ?? (keys as any).moduleName ?? '');
          const fn = String((keys as any).function ?? (keys as any).functionName ?? '');
          return await client.getNormalizedMoveFunction({ package: pkg, module: mod, function: fn });
        }

        const [pkg, mod, fn] = Array.isArray(keys) ? keys : [keys, undefined, undefined];
        return await client.getNormalizedMoveFunction({
          package: String(pkg ?? ''),
          module: String(mod ?? ''),
          function: String(fn ?? ''),
        });
      };
    }

    if (typeof core.getObjects !== 'function') {
      core.getObjects = async (ids: any) => {
        let idsArray: string[] = [];
        if (Array.isArray(ids)) {
          idsArray = ids.map(String);
        } else if (ids && Array.isArray(ids.ids)) {
          idsArray = ids.ids.map(String);
        } else if (typeof ids === 'string') {
          idsArray = [ids];
        } else if (ids && typeof ids === 'object') {
          try {
            idsArray = Array.from(ids as Iterable<any>).map(String);
          } catch {
            idsArray = [];
          }
        }
        if (idsArray.length === 0) return [];
        try {
          const results = await client.multiGetObjects({
            ids: idsArray,
            options: {
              showType: true,
              showOwner: true,
              showContent: true,
              showDisplay: true,
              showBcs: true,
            },
          });
          if (Array.isArray(results)) {
            if (results.length !== idsArray.length) {
              const byId = new Map(results.map((r: any) => [r?.data?.objectId || r?.objectId, r]));
              return idsArray.map((id) => byId.get(id) ?? null);
            }
            return results;
          }
          return idsArray.map(() => results ?? null);
        } catch (err) {
          return idsArray.map(() => null);
        }
      };
    }

    wrapped.core = core;
    return wrapped;
  };

  const client = new SealClient({
    suiClient: wrapForSeal(suiClient as any),
    serverConfigs: SERVER_OBJECT_IDS.map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  useEffect(() => {
    if (allowlistId) {
      loadAllowlistData();
    }
  }, [allowlistId]);

  const loadAllowlistData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get allowlist object data
      const allowlist = await suiClient.getObject({
        id: allowlistId,
        options: { showContent: true },
      });

      // Get encrypted objects (blob IDs) associated with this allowlist
      const encryptedObjects = await suiClient
        .getDynamicFields({
          parentId: allowlistId,
        })
        .then((res: { data: any[] }) => res.data.map((obj) => obj.name.value as string));

      const fields = (allowlist.data?.content as { fields: any })?.fields || {};
      
      setFeedData({
        allowlistId,
        allowlistName: fields?.name || 'Unnamed Allowlist',
        blobIds: encryptedObjects,
      });

    } catch (error) {
      console.error('Failed to load allowlist data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load allowlist data');
    } finally {
      setLoading(false);
    }
  };

  const constructMoveCall = (packageId: string, allowlistId: string): MoveCallConstructor => {
    return (tx: Transaction, id: string) => {
      tx.moveCall({
        target: `${packageId}::allowlist::seal_approve`,
        arguments: [tx.pure.vector('u8', fromHex(id)), tx.object(allowlistId)],
      });
    };
  };


  const downloadAndDecryptFiles = async (blobIds: string[], allowlistId: string) => {
    if (!user?.address) {
      toast.error('Wallet address not available');
      return;
    }

    setIsDecrypting(true);
    setError(null);

    try {
      // Check for existing session key
      const imported: ExportedSessionKey = await get('sessionKey');

      if (imported) {
        try {
          const currentSessionKey = await SessionKey.import(
            imported,
            new SuiClient({ url: getFullnodeUrl('testnet') }) as any,
          );
          
          if (
            currentSessionKey &&
            !currentSessionKey.isExpired() &&
            currentSessionKey.getAddress() === user.address
          ) {
            const moveCallConstructor = constructMoveCall(TESTNET_PACKAGE_ID, allowlistId);
            await downloadAndDecrypt(blobIds, currentSessionKey, moveCallConstructor);
            return;
          }
        } catch (error) {
          console.log('Imported session key is expired', error);
        }
      }

      // Create new session key
      await set('sessionKey', null);

      const sessionKey = await SessionKey.create({
        address: user.address,
        packageId: TESTNET_PACKAGE_ID,
        ttlMin: TTL_MIN,
        suiClient: suiClient as any,
        mvrName: '@pkg/seal-demo-1234', // Correct MVR name from SW_example
      });

      signPersonalMessage(
        {
          message: sessionKey.getPersonalMessage(),
        },
        {
          onSuccess: async (result: { signature: string }) => {
            await sessionKey.setPersonalMessageSignature(result.signature);
            const moveCallConstructor = constructMoveCall(TESTNET_PACKAGE_ID, allowlistId);
            await downloadAndDecrypt(blobIds, sessionKey, moveCallConstructor);
            await set('sessionKey', sessionKey.export());
          },
          onError: (error) => {
            console.error('Failed to sign personal message:', error);
            setError('Failed to authenticate for decryption');
            setIsDecrypting(false);
          },
        },
      );

    } catch (error) {
      console.error('Failed to decrypt files:', error);
      setError(error instanceof Error ? error.message : 'Failed to decrypt files');
      setIsDecrypting(false);
    }
  };

  const downloadAndDecrypt = async (
    blobIds: string[],
    sessionKey: SessionKey,
    moveCallConstructor: MoveCallConstructor,
  ) => {
    const aggregators = [
      'aggregator1',
      'aggregator2',
      'aggregator3',
      'aggregator4',
      'aggregator5',
      'aggregator6',
    ];
    
    // First, download all files in parallel (ignore errors)
    const downloadResults = await Promise.all(
      blobIds.map(async (blobId) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const randomAggregator = aggregators[Math.floor(Math.random() * aggregators.length)];
          const aggregatorUrl = `/${randomAggregator}/v1/blobs/${blobId}`;
          const response = await fetch(aggregatorUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (!response.ok) {
            return null;
          }
          return await response.arrayBuffer();
        } catch (err) {
          console.error(`Blob ${blobId} cannot be retrieved from Walrus`, err);
          return null;
        }
      }),
    );

    // Filter out failed downloads
    const validDownloads = downloadResults.filter((result): result is ArrayBuffer => result !== null);
    console.log('validDownloads count', validDownloads.length);

    if (validDownloads.length === 0) {
      const errorMsg =
        'Cannot retrieve files from this Walrus aggregator, try again (a randomly selected aggregator will be used). Files uploaded more than 1 epoch ago have been deleted from Walrus.';
      console.error(errorMsg);
      setError(errorMsg);
      setIsDecrypting(false);
      return;
    }

    // Fetch keys in batches of <=10
    for (let i = 0; i < validDownloads.length; i += 10) {
      const batch = validDownloads.slice(i, i + 10);
      const ids = batch.map((enc) => EncryptedObject.parse(new Uint8Array(enc)).id);
      const tx = new Transaction();
      ids.forEach((id) => moveCallConstructor(tx, id));
      const txBytes = await tx.build({ client: suiClient as any, onlyTransactionKind: true });
      try {
        await client.fetchKeys({ ids, txBytes, sessionKey, threshold: 2 });
      } catch (err) {
        console.log(err);
        const errorMsg =
          err instanceof NoAccessError
            ? 'No access to decryption keys - make sure your wallet is added to the allowlist'
            : 'Unable to decrypt files, try again';
        console.error(errorMsg, err);
        setError(errorMsg);
        setIsDecrypting(false);
        return;
      }
    }

    // Then, decrypt files sequentially
    const decryptedFiles: DecryptedFile[] = [];
    for (const encryptedData of validDownloads) {
      const fullId = EncryptedObject.parse(new Uint8Array(encryptedData)).id;
      const tx = new Transaction();
      moveCallConstructor(tx, fullId);
      const txBytes = await tx.build({ client: suiClient as any, onlyTransactionKind: true });
      try {
        // Note that all keys are fetched above, so this only local decryption is done
        const decryptedFile = await client.decrypt({
          data: new Uint8Array(encryptedData),
          sessionKey,
          txBytes,
        });
        const blob = new Blob([decryptedFile], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        decryptedFiles.push({
          url,
          filename: `decrypted_file_${decryptedFiles.length + 1}`,
          contentType: 'application/octet-stream',
        });
      } catch (err) {
        console.log(err);
        const errorMsg =
          err instanceof NoAccessError
            ? 'No access to decryption keys'
            : 'Unable to decrypt files, try again';
        console.error(errorMsg, err);
        setError(errorMsg);
        setIsDecrypting(false);
        return;
      }
    }

    if (decryptedFiles.length > 0) {
      setDecryptedFiles(decryptedFiles);
      setShowDecryptedFiles(true);
      toast.success(`Successfully decrypted ${decryptedFiles.length} files!`);
    }
    setIsDecrypting(false);
  };

  const getSuiVisionLink = (objectId: string) => {
    return `https://suiscan.xyz/testnet/object/${objectId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          isAuthenticated={isAuthenticated}
          user={user}
          onNavigateToAuth={onNavigateToAuth}
          onNavigateToDashboard={onNavigateToLanding}
        />
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading allowlist...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          isAuthenticated={isAuthenticated}
          user={user}
          onNavigateToAuth={onNavigateToAuth}
          onNavigateToDashboard={onNavigateToLanding}
        />
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={onNavigateToLanding} className="w-full">
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          isAuthenticated={isAuthenticated}
          user={user}
          onNavigateToAuth={onNavigateToAuth}
          onNavigateToDashboard={onNavigateToLanding}
        />
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
            <div className="text-blue-500 text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Wallet Required</h1>
            <p className="text-gray-600 mb-6">
              You need to connect your wallet to access this allowlist.
            </p>
            <div className="space-y-3">
              <Button onClick={onNavigateToAuth} className="w-full">
                Connect Wallet
              </Button>
              <Button onClick={onNavigateToLanding} variant="outline" className="w-full">
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isAuthenticated={isAuthenticated}
        user={user}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToDashboard={onNavigateToLanding}
      />
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Allowlist Viewer</h1>
            <Button onClick={onNavigateToLanding} variant="outline">
              ← Back to Home
            </Button>
          </div>
          
          {feedData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-semibold text-lg">
                  {feedData.allowlistName}
                </h2>
              </div>
              <p className="text-sm text-gray-600">
                Allowlist ID: {feedData.allowlistId}
              </p>
              <p className="text-sm text-gray-600">
                <a 
                  href={getSuiVisionLink(feedData.allowlistId)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View on SuiVision →
                </a>
              </p>
              {user && (
                <p className="text-sm text-gray-600">
                  Connected as: {user.label || user.address}
                </p>
              )}
              <p className="text-sm text-gray-600">
                Files available: {feedData.blobIds.length}
              </p>
            </div>
          )}
        </div>

        {/* File Actions */}
        {feedData && feedData.blobIds.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Encrypted Files</h2>
              <div className="space-x-3">
                <Button 
                  onClick={() => downloadAndDecryptFiles(feedData.blobIds, feedData.allowlistId)}
                  disabled={isDecrypting}
                >
                  {isDecrypting ? 'Decrypting...' : 'Decrypt & Download Files'}
                </Button>
              </div>
            </div>
            <p className="text-gray-600">
              This allowlist contains {feedData.blobIds.length} encrypted file(s). 
              Click the button above to decrypt and download them.
            </p>
          </div>
        )}

        {/* Decrypted Files Display */}
        {showDecryptedFiles && decryptedFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Decrypted Files</h2>
              <Button 
                onClick={() => setShowDecryptedFiles(false)} 
                variant="outline"
              >
                Hide Files
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decryptedFiles.map((file, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">{file.filename}</h3>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = file.url;
                        a.download = file.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="w-full"
                    >
                      Download
                    </Button>
                    <Button 
                      onClick={() => window.open(file.url, '_blank')}
                      variant="outline"
                      className="w-full"
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Files Message */}
        {feedData && feedData.blobIds.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📁</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Files Found</h2>
              <p className="text-gray-600">
                This allowlist doesn't contain any files yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
