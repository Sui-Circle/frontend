import React, { useState } from 'react';
import { Upload, ImageIcon, Plus, X, Copy, Check, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { toast } from 'sonner';
import { SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import { useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { suiClient as contractSuiClient } from '@/contract';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToFileList?: () => void;
  isAuthenticated?: boolean;
  user?: any;
  onLogout?: () => void;
}


interface WalrusService {
  id: string;
  name: string;
  publisherUrl: string;
  aggregatorUrl: string;
}

interface UploadProgress {
  step: 'encrypting' | 'uploading' | 'associating' | 'creating-allowlist' | 'completed';
  message: string;
}

// SEAL and Walrus configuration
const TESTNET_PACKAGE_ID = '0xc5ce2742cac46421b62028557f1d7aea8a4c50f651379a79afdf12cd88628807';
const NUM_EPOCH = 1;
const SERVER_OBJECT_IDS = [
  "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", 
  "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8"
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToAuth,
  onNavigateToFileList,
  isAuthenticated = false,
  user,
  onLogout
}) => {
  console.log('🏠 LandingPage component rendered', { isAuthenticated, user });
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // SEAL and Allowlist form state
  const [allowlistName, setAllowlistName] = useState('');
  const [walletAddresses, setWalletAddresses] = useState<string[]>(['']);
  const [selectedWalrusService, setSelectedWalrusService] = useState('service1');
  
  // Upload progress and states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [currentStep, setCurrentStep] = useState<'create-allowlist' | 'upload-file' | 'access-control' | 'uploading' | 'success'>('create-allowlist');
  const [generatedShareLink, setGeneratedShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [createdAllowlistId, setCreatedAllowlistId] = useState<string | null>(null);

  // Animation states
  const [isTransitioning, setIsTransitioning] = useState(false);

  // SEAL and Sui setup
  // Wallet-bound client for signing/executing; keep for wallet flows
  const walletSuiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await walletSuiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  // Verify package exists on testnet
  const verifyPackage = async () => {
    try {
      // Use direct SuiClient instance aligned with @mysten/sui/client
      const packageData = await contractSuiClient.getObject({
        id: TESTNET_PACKAGE_ID,
        options: { showContent: true }
      });
      console.log('Package verification:', packageData);
      console.log('Package data exists:', packageData.data !== null);
      if (packageData.data) {
        console.log('Package content:', packageData.data.content);
      }
      return packageData.data !== null;
    } catch (error) {
      console.error('Package verification failed:', error);
      return false;
    }
  };
  
  // Minimal wrapper that adds the missing `core` field SealClient expects
  const wrapForSeal = (client: any) => {
    const wrapped = { ...client };
    const core = { ...(client?.core || {}) };

    if (typeof core.getMoveFunction !== 'function') {
      core.getMoveFunction = async (keys: any) => {
        try {
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
        } catch (error) {
          console.error('getMoveFunction failed:', error);
          throw error;
        }
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

  // Create SEAL client when needed
  const createSealClient = () => new SealClient({
    suiClient: wrapForSeal(contractSuiClient),
    serverConfigs: SERVER_OBJECT_IDS.map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  // Walrus services configuration
  const walrusServices: WalrusService[] = [
    {
      id: 'service1',
      name: 'walrus.space',
      publisherUrl: '/publisher1',
      aggregatorUrl: '/aggregator1',
    },
    {
      id: 'service2',
      name: 'staketab.org',
      publisherUrl: '/publisher2',
      aggregatorUrl: '/aggregator2',
    },
    {
      id: 'service3',
      name: 'redundex.com',
      publisherUrl: '/publisher3',
      aggregatorUrl: '/aggregator3',
    },
    {
      id: 'service4',
      name: 'nodes.guru',
      publisherUrl: '/publisher4',
      aggregatorUrl: '/aggregator4',
    },
    {
      id: 'service5',
      name: 'banansen.dev',
      publisherUrl: '/publisher5',
      aggregatorUrl: '/aggregator5',
    },
    {
      id: 'service6',
      name: 'everstake.one',
      publisherUrl: '/publisher6',
      aggregatorUrl: '/aggregator6',
    },
  ];

  // Helper function for Walrus URLs
  const getPublisherUrl = (path: string): string => {
    const service = walrusServices.find((s) => s.id === selectedWalrusService);
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `${service?.publisherUrl}/v1/${cleanPath}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log('📁 File dropped:', files[0]);
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log('📁 File selected via file input:', e.target.files[0]);
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file size (10 MiB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10 MiB');
      return;
    }
    
    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    setSelectedFile(file);
    toast.success(`Selected "${file.name}" for upload`);
  };

  const transitionToStep = (step: 'create-allowlist' | 'upload-file' | 'access-control' | 'uploading' | 'success') => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsTransitioning(false);
    }, 300);
  };

  // Create allowlist first, then proceed to upload step
  const handleCreateAllowlist = async () => {
    if (!allowlistName.trim()) {
      toast.error('Please enter an allowlist name');
      return;
    }

    if (!user?.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    console.log('Creating allowlist with name:', allowlistName);
    console.log('User address:', user.address);
    console.log('Package ID:', TESTNET_PACKAGE_ID);

    setIsUploading(true);
    setUploadProgress({ step: 'creating-allowlist', message: 'Verifying smart contract...' });

    // First verify the package exists
    const packageExists = await verifyPackage();
    if (!packageExists) {
      throw new Error('Smart contract package not found on testnet. Please check the package ID.');
    }

    // Check user's SUI balance
    try {
      const balance = await contractSuiClient.getBalance({
        owner: user.address,
        coinType: '0x2::sui::SUI'
      });
      console.log('User SUI balance:', balance);
      
      if (parseInt(balance.totalBalance) === 0) {
        throw new Error('Insufficient SUI balance. Please add some SUI to your wallet to pay for gas fees.');
      }
    } catch (error) {
      console.error('Balance check failed:', error);
    }

    setUploadProgress({ step: 'creating-allowlist', message: 'Creating allowlist on Sui...' });

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${TESTNET_PACKAGE_ID}::allowlist::create_allowlist_entry`,
        arguments: [tx.pure.string(allowlistName)],
      });
      tx.setGasBudget(10000000);
      
      console.log('Transaction created:', tx);

      signAndExecute(
        { 
          transaction: tx as any
        },
        {
          onSuccess: async (result) => {
            console.log('Allowlist creation result:', result);
            console.log('Result effects:', (result as any).effects);
            console.log('Result created objects:', (result as any).effects?.created);
            
            // Extract the created allowlist object ID
            const effects = (result as any).effects;
            
            // Log the complete result structure for debugging
            console.log('=== COMPLETE TRANSACTION RESULT ===');
            console.log('Result keys:', Object.keys(result));
            console.log('Effects keys:', effects ? Object.keys(effects) : 'No effects');
            console.log('Created objects:', effects?.created);
            console.log('Mutated objects:', effects?.mutated);
            console.log('Deleted objects:', effects?.deleted);
            console.log('Object changes:', (result as any).objectChanges);
            console.log('Events:', (result as any).events);
            console.log('=====================================');

            if (!effects || !effects.created || effects.created.length === 0) {
              console.error('No created objects in transaction result');
              console.error('Effects:', effects);
              console.error('Transaction status:', (result as any).effects?.status);
              console.error('Full transaction result:', JSON.stringify(result, null, 2));
              
              // Check if transaction failed
              const status = (result as any).effects?.status;
              if (status && status.status && status.status !== 'success') {
                throw new Error('Transaction failed: ' + JSON.stringify(status));
              }
              
              // Also check for digest to confirm transaction succeeded
              if (!(result as any).digest) {
                console.warn('No transaction digest found, but continuing...');
              }
              
              // Check if objects were mutated instead of created
              if (effects?.mutated && effects.mutated.length > 0) {
                console.log('Found mutated objects instead of created:', effects.mutated);
                // Try to use the first mutated object
                const mutatedObject = effects.mutated[0];
                if (mutatedObject?.reference?.objectId) {
                  const createdObjectId = mutatedObject.reference.objectId;
                  console.log('Using mutated object ID:', createdObjectId);
                  setCreatedAllowlistId(createdObjectId);
                  setUploadProgress({ step: 'encrypting', message: 'Encrypting file with SEAL...' });
                  await handleEncryptAndUpload(createdObjectId);
                  return;
                }
              }
              
              throw new Error('Transaction succeeded but no objects were created. This might indicate an issue with the smart contract call.');
            }
            
            // Extract the created allowlist object ID from the transaction result (exactly like SW_example)
            const allowlistObject = effects.created?.find(
              (item: any) => item.owner && typeof item.owner === 'object' && 'Shared' in item.owner,
            );
            const createdObjectId = allowlistObject?.reference?.objectId;
            
            console.log('Found allowlist object:', allowlistObject);
            console.log('Extracted object ID:', createdObjectId);
            
            if (createdObjectId) {
              setCreatedAllowlistId(createdObjectId);
              setIsUploading(false);
              setUploadProgress(null);
              toast.success('Allowlist created successfully!');
              
              // Transition to upload file step
              transitionToStep('upload-file');
            } else {
              console.error('Full result structure:', JSON.stringify(result, null, 2));
              throw new Error('Failed to extract allowlist object ID from transaction result');
            }
          },
          onError: (error) => {
            console.error('Allowlist creation failed:', error);
            toast.error('Failed to create allowlist: ' + error.message);
            setIsUploading(false);
            setUploadProgress(null);
          }
        }
      );
    } catch (error) {
      console.error('Allowlist creation error:', error);
      toast.error('Failed to create allowlist');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Handle file upload step - just transition to access control
  const handleUploadFile = () => {
    console.log('handleUploadFile called', { selectedFile, createdAllowlistId, isUploading });
    
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!createdAllowlistId) {
      toast.error('No allowlist found');
      return;
    }

    console.log('Transitioning to access-control step');
    // Transition to access control step
    transitionToStep('access-control');
  };

  // Encrypt file with SEAL and upload to Walrus
  const handleEncryptAndUpload = async (allowlistId: string) => {
    if (!selectedFile) return;

    try {
      // Step 1: Read file as ArrayBuffer
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          try {
            // Step 2: Encrypt with SEAL
            const nonce = crypto.getRandomValues(new Uint8Array(5));
            const policyObjectBytes = fromHex(allowlistId);
            const id = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));
            
            const sealClient = createSealClient();
            const { encryptedObject: encryptedBytes } = await sealClient.encrypt({
              threshold: 2,
              packageId: TESTNET_PACKAGE_ID,
              id,
              data: new Uint8Array(event.target.result),
            });

            setUploadProgress({ step: 'uploading', message: 'Uploading encrypted file to Walrus...' });

            // Step 3: Upload to Walrus
            const response = await fetch(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`)}`, {
              method: 'PUT',
              body: encryptedBytes,
            });

            if (!response.ok) {
              throw new Error('Failed to upload to Walrus. Please try a different service.');
            }

            const storageInfo = await response.json();
            console.log('Walrus storage info:', storageInfo);

            let blobId: string;
            if ('alreadyCertified' in storageInfo) {
              blobId = storageInfo.alreadyCertified.blobId;
            } else if ('newlyCreated' in storageInfo) {
              blobId = storageInfo.newlyCreated.blobObject.blobId;
    } else {
              throw new Error('Unexpected Walrus response format');
            }

            setUploadProgress({ step: 'associating', message: 'Associating file with allowlist on Sui...' });

            // Step 4: Associate blob with allowlist on Sui
            await associateFileWithAllowlist(allowlistId, blobId);

          } catch (error) {
            console.error('Encryption/Upload error:', error);
            toast.error('Failed to encrypt and upload file: ' + (error as Error).message);
            setIsUploading(false);
            setUploadProgress(null);
          }
        }
      };

      reader.readAsArrayBuffer(selectedFile);

    } catch (error) {
      console.error('File reading error:', error);
      toast.error('Failed to read file');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Associate uploaded blob with allowlist on Sui
  const associateFileWithAllowlist = async (allowlistId: string, blobId: string) => {
    try {
      // Get the cap ID for this allowlist
      const ownedObjects = await contractSuiClient.getOwnedObjects({
        owner: user?.address!,
        options: { showContent: true, showType: true },
        filter: { StructType: `${TESTNET_PACKAGE_ID}::allowlist::Cap` },
      });

      const capId = ownedObjects.data
        .map((obj) => {
          const fields = (obj?.data?.content as { fields: any })?.fields;
          return {
            id: fields?.id.id,
            allowlist_id: fields?.allowlist_id,
          };
        })
        .filter((item) => item.allowlist_id === allowlistId)
        .map((item) => item.id)[0] as string;

      if (!capId) {
        throw new Error('Cannot find capability for this allowlist');
      }

      const tx = new Transaction();
      tx.moveCall({
        target: `${TESTNET_PACKAGE_ID}::allowlist::publish`,
        arguments: [tx.object(allowlistId), tx.object(capId), tx.pure.string(blobId)],
      });
      tx.setGasBudget(10000000);

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: () => {
            setUploadProgress({ step: 'completed', message: 'File successfully uploaded and secured!' });
            
            // File successfully uploaded and associated

            // Generate share link
            const shareLink = `${window.location.origin}/allowlist/${allowlistId}`;
            setGeneratedShareLink(shareLink);

            // Stay on landing page and show success
            setTimeout(() => {
              setIsUploading(false);
              setUploadProgress(null);
              transitionToStep('success');
              toast.success('File uploaded and secured successfully!');
            }, 1000);
          },
          onError: (error) => {
            console.error('Association failed:', error);
            toast.error('Failed to associate file with allowlist: ' + error.message);
            setIsUploading(false);
            setUploadProgress(null);
          }
        }
      );

    } catch (error) {
      console.error('Association error:', error);
      toast.error('Failed to associate file with allowlist');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Wallet address management
  const addWalletAddress = () => {
    setWalletAddresses([...walletAddresses, '']);
  };

  const removeWalletAddress = (index: number) => {
    if (walletAddresses.length > 1) {
      setWalletAddresses(walletAddresses.filter((_, i) => i !== index));
    }
  };

  const updateWalletAddress = (index: number, value: string) => {
    const newAddresses = [...walletAddresses];
    newAddresses[index] = value;
    setWalletAddresses(newAddresses);
  };

  const validateWalletAddress = (address: string): boolean => {
    // Allow empty addresses (for open access) or valid Sui addresses
    const trimmed = address.trim();
    console.log('🔍 Validating address:', trimmed);
    
    if (trimmed === '') {
      console.log('✅ Empty address (open access)');
      return false; // Empty addresses are not valid for our current use case
    }
    
    // Sui addresses can be 40-66 characters after 0x
    const isValid = /^0x[a-fA-F0-9]{40,66}$/i.test(trimmed);
    console.log('✅ Address valid:', isValid);
    return isValid;
  };

  // Add single address to allowlist (like SW_example)
  const handleAddAddress = async (address: string) => {
    if (!createdAllowlistId) {
      toast.error('No allowlist found');
      return;
    }

    if (!validateWalletAddress(address)) {
      toast.error('Invalid wallet address');
      return;
    }

    try {
      // Get the cap ID for this allowlist
      const ownedObjects = await contractSuiClient.getOwnedObjects({
        owner: user?.address!,
        options: { showContent: true, showType: true },
        filter: { StructType: `${TESTNET_PACKAGE_ID}::allowlist::Cap` },
      });

      const capId = ownedObjects.data
        .map((obj) => {
          const fields = (obj?.data?.content as { fields: any })?.fields;
          return {
            id: fields?.id.id,
            allowlist_id: fields?.allowlist_id,
          };
        })
        .filter((item) => item.allowlist_id === createdAllowlistId)
        .map((item) => item.id)[0] as string;

      if (!capId) {
        throw new Error('Cannot find capability for this allowlist');
      }

      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(createdAllowlistId), tx.object(capId), tx.pure.address(address.trim())],
        target: `${TESTNET_PACKAGE_ID}::allowlist::add`,
      });
      tx.setGasBudget(10000000);

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: (result: any) => {
            console.log('Added address to allowlist:', address, result);
            toast.success('Address added to allowlist successfully!');
          },
          onError: (error: any) => {
            console.error('Failed to add address:', address, error);
            toast.error('Failed to add address: ' + error.message);
          }
        }
      );

    } catch (error) {
      console.error('Failed to add address to allowlist:', error);
      toast.error('Failed to add address: ' + (error as Error).message);
    }
  };

  // Start the upload process after access control
  const handleStartUpload = async () => {
    setIsUploading(true);
    setUploadProgress({ step: 'encrypting', message: 'Encrypting file with SEAL...' });
    transitionToStep('uploading');
    
    // Proceed with file encryption and upload
    await handleEncryptAndUpload(createdAllowlistId!);
  };

  const copyShareLink = async () => {
    if (generatedShareLink) {
      try {
        await navigator.clipboard.writeText(generatedShareLink);
        setLinkCopied(true);
        toast.success('Share link copied to clipboard!');
        
        // Reset the copied state after 2 seconds
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy link to clipboard');
      }
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setAllowlistName('');
    setWalletAddresses(['']);
    setGeneratedShareLink(null);
    setLinkCopied(false);
    setCreatedAllowlistId(null);
    setIsUploading(false);
    setUploadProgress(null);
    setCurrentStep('create-allowlist');
  };

  const goBack = () => {
    if (currentStep === 'access-control') {
      transitionToStep('upload-file');
    } else if (currentStep === 'success') {
      transitionToStep('access-control');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToDashboard={onNavigateToFileList}
      />
      
      {/* Main Content */}
      <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <div className={`text-center mb-8 sm:mb-12 lg:mb-16 max-w-4xl transition-all duration-500 ${
          currentStep !== 'create-allowlist' ? 'transform -translate-y-4 scale-95 opacity-60' : ''
        }`}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-black mb-4 leading-tight">
            Send it. Own it. On Chain
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-medium">
            Powered by Sui & SEAL Encryption
          </p>
        </div>

        {/* Progress Indicator */}
        {currentStep !== 'create-allowlist' && (
          <div className="w-full max-w-lg mb-6 sm:mb-8">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentStep === 'upload-file' || currentStep === 'access-control' || currentStep === 'uploading' || currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${
                currentStep === 'upload-file' || currentStep === 'access-control' || currentStep === 'uploading' || currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentStep === 'upload-file' ? 'bg-black' : (currentStep === 'access-control' || currentStep === 'uploading' || currentStep === 'success') ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${
                currentStep === 'access-control' || currentStep === 'uploading' || currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentStep === 'access-control' ? 'bg-black' : (currentStep === 'uploading' || currentStep === 'success') ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${
                currentStep === 'uploading' || currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentStep === 'uploading' ? 'bg-black' : currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${
                currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentStep === 'success' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-gray-500 mt-2">
              <span>Create</span>
              <span>Upload</span>
              <span>Access</span>
              <span>Process</span>
              <span>Success</span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`w-full max-w-2xl transition-all duration-500 ${isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
          {/* Step 1 - Create Allowlist */}
          {currentStep === 'create-allowlist' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              
              <div className="space-y-6">
                {/* Allowlist Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Allowlist Name *
                  </label>
                  <input
                    type="text"
                    value={allowlistName}
                    onChange={(e) => setAllowlistName(e.target.value)}
                    placeholder="Enter allowlist name..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                  />
                </div>


                {/* Action Button */}
                <Button
                  onClick={handleCreateAllowlist}
                  disabled={!allowlistName.trim() || isUploading}
                  className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Allowlist
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 - Upload File */}
          {currentStep === 'upload-file' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-black mb-2">Upload File</h2>
                  <p className="text-gray-600">Upload your file to the "{allowlistName}" allowlist</p>
                </div>

                {/* Allowlist Info */}
                {createdAllowlistId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-medium text-blue-900 mb-1">Allowlist: "{allowlistName}"</h3>
                    <p className="text-sm text-blue-700">
                      Allowlist ID: {' '}
                      <a
                        href={`https://suiscan.xyz/testnet/object/${createdAllowlistId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-900 transition-colors"
                      >
                        {createdAllowlistId.slice(0, 10)}...
                      </a>
                    </p>
                  </div>
                )}

                {/* Walrus Service Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Walrus Service
                  </label>
                  <select
                    value={selectedWalrusService}
                    onChange={(e) => setSelectedWalrusService(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                  >
                    {walrusServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload Section */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Upload File *
                  </label>
                  <p className="text-xs text-red-600 mb-3">
                    File size must be less than 10 MiB. Only image files are allowed.
                  </p>
                  
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                isDragOver
                        ? 'border-black bg-gradient-to-br from-black/5 to-black/10'
                        : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
                    {selectedFile ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <Button
                          onClick={() => setSelectedFile(null)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-gray-600">Drop image here or click to browse</p>
                          <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                        </div>
                <input
                  type="file"
                  onChange={handleFileInputChange}
                          accept="image/*"
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  asChild
                          variant="outline"
                          className="mt-2"
                >
                  <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            Choose File
                          </label>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleUploadFile}
                    disabled={!selectedFile || isUploading}
                    className="flex-1 bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload File {!selectedFile ? '(No File)' : ''} {isUploading ? '(Uploading)' : ''}
                  </Button>
                  <Button
                    onClick={() => transitionToStep('create-allowlist')}
                    variant="outline"
                    className="px-6 py-3 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    Back
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Progress */}
       

          {/* Access Control Step */}
          {currentStep === 'access-control' && createdAllowlistId && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 transform transition-all duration-500 animate-in fade-in slide-in-from-right-4">
              
              {/* Header with back button */}
              <div className="flex items-center gap-3 mb-6">
                <Button
                  onClick={goBack}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-black mb-1">Access Control Settings</h2>
                  <p className="text-gray-600 text-sm sm:text-base">Add wallet addresses to your "{allowlistName}" allowlist</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Share Link */}
                {createdAllowlistId && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h3 className="font-medium text-green-900 mb-2">Share Link</h3>
                    <p className="text-sm text-green-700 mb-2">
                      Share this link with users to access the files associated with this allowlist:
                    </p>
                    <a
                      href={`${window.location.origin}/allowlist/${createdAllowlistId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 underline hover:text-blue-800 break-all"
                    >
                      {window.location.origin}/allowlist/{createdAllowlistId}
                    </a>
                  </div>
                )}

                {/* Wallet Addresses */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Add Wallet Addresses
                  </label>
                  <p className="text-xs text-gray-500">Add specific wallet addresses to the allowlist</p>
                  
                  <div className="space-y-3">
                    {walletAddresses.map((address, index) => (
                      <div key={index} className="group">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => updateWalletAddress(index, e.target.value)}
                              placeholder="0x..."
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                            />
                            {address && validateWalletAddress(address) && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => handleAddAddress(address)}
                            disabled={!address.trim() || !validateWalletAddress(address)}
                            className="px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </Button>
                          {walletAddresses.length > 1 && (
                            <Button
                              onClick={() => removeWalletAddress(index)}
                              variant="ghost"
                              size="sm"
                              className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={addWalletAddress}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Add another wallet
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={handleStartUpload}
                    className="flex-1 bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02]"
                  >
                    Upload File & Complete Setup
                  </Button>
                  <Button
                    onClick={() => transitionToStep('upload-file')}
                    variant="outline"
                    className="px-6 py-3 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    Back
                </Button>
                </div>
              </div>
            </div>
          )}

          {/* Uploading Step */}
          {currentStep === 'uploading' && uploadProgress && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center space-y-6">
                {/* Animated Progress Circle */}
                <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full animate-pulse" />
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                  <div className="absolute -inset-4 bg-blue-400/20 rounded-full animate-ping" />
                </div>

                {/* Progress Message */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {uploadProgress.step === 'encrypting' && 'Encrypting File'}
                    {uploadProgress.step === 'uploading' && 'Uploading to Walrus'}
                    {uploadProgress.step === 'associating' && 'Attaching to Sui Object'}
                    {uploadProgress.step === 'completed' && 'Almost Done!'}
                  </h3>
                  <p className="text-gray-600">{uploadProgress.message}</p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Encrypt</span>
                    <span>Upload</span>
                    <span>Attach</span>
                    <span>Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ${
                        uploadProgress.step === 'encrypting' ? 'w-1/4' :
                        uploadProgress.step === 'uploading' ? 'w-2/4' :
                        uploadProgress.step === 'associating' ? 'w-3/4' :
                        'w-full'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Page */}
          {currentStep === 'success' && (
            <div className="text-center space-y-6 transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              
              {/* Success Animation */}
              <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse" />
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
                </div>
                <div className="absolute -inset-4 bg-green-400/20 rounded-full animate-ping" />
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20">
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 sm:p-6 mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-2 flex items-center gap-2 justify-center">
                    <Sparkles className="w-5 h-5" />
                    Allowlist Created Successfully!
                  </h3>
                  <p className="text-green-700 text-sm sm:text-base">
                    Your file "{selectedFile?.name}" has been encrypted and secured on the blockchain.
                  </p>
                </div>

                {generatedShareLink && (
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Share Link
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={generatedShareLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-mono break-all"
                      />
                      <Button
                        onClick={copyShareLink}
                        variant="outline"
                        size="sm"
                        className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                          linkCopied ? 'bg-green-50 border-green-200 text-green-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        {linkCopied ? (
                          <div className="flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Copied!</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Copy</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-medium text-blue-900 mb-1">Allowlist: "{allowlistName}"</h4>
                    <p className="text-sm text-blue-700">
                      Allowlist ID: {createdAllowlistId?.slice(0, 10)}...
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => onNavigateToFileList?.()}
                    className="flex-1 bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02]"
                  >
                    View Dashboard
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="px-6 py-3 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    Create Another
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
