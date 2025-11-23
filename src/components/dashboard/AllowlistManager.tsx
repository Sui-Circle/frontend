import React, { useState, useEffect } from 'react';
import { useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Transaction } from '@mysten/sui/transactions';
import { Plus, Users, ExternalLink, Settings, X, Check, Trash2 } from 'lucide-react';

interface AllowlistData {
  id: string;
  name: string;
  addresses: string[];
  fileCount: number;
  createdAt: string;
}

interface AllowlistManagerProps {
  user: any;
}

const TESTNET_PACKAGE_ID = '0xc5ce2742cac46421b62028557f1d7aea8a4c50f651379a79afdf12cd88628807';

export const AllowlistManager: React.FC<AllowlistManagerProps> = ({ user }) => {
  const [allowlists, setAllowlists] = useState<AllowlistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAllowlist, setSelectedAllowlist] = useState<AllowlistData | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isRemovingAddress, setIsRemovingAddress] = useState(false);

  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  useEffect(() => {
    if (user?.address) {
      loadAllowlists();
    }
  }, [user?.address]);

  const loadAllowlists = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all Cap objects owned by the user (these represent allowlists the user can manage)
      const caps = await suiClient.getOwnedObjects({
        owner: user.address,
        options: { showContent: true, showType: true },
        filter: { StructType: `${TESTNET_PACKAGE_ID}::allowlist::Cap` },
      });

      const allowlistData: AllowlistData[] = [];

      for (const cap of caps.data) {
        if (cap.data?.content) {
          const capFields = (cap.data.content as { fields: any })?.fields;
          const allowlistId = capFields?.allowlist_id;

          if (allowlistId) {
            // Get the actual allowlist object
            const allowlist = await suiClient.getObject({
              id: allowlistId,
              options: { showContent: true },
            });

            if (allowlist.data?.content) {
              const fields = (allowlist.data.content as { fields: any })?.fields;
              
              // Get dynamic fields (blob IDs) to count files
              const dynamicFields = await suiClient.getDynamicFields({
                parentId: allowlistId,
              });

              allowlistData.push({
                id: allowlistId,
                name: fields?.name || 'Unnamed Allowlist',
                addresses: fields?.list || [],
                fileCount: dynamicFields.data.length,
                createdAt: new Date(parseInt(allowlist.data.version || '0')).toLocaleDateString(),
              });
            }
          }
        }
      }

      setAllowlists(allowlistData);
    } catch (error) {
      console.error('Failed to load allowlists:', error);
      setError(error instanceof Error ? error.message : 'Failed to load allowlists');
    } finally {
      setLoading(false);
    }
  };

  const validateWalletAddress = (address: string): boolean => {
    const trimmed = address.trim();
    if (trimmed === '') return false;
    return /^0x[a-fA-F0-9]{40,66}$/i.test(trimmed);
  };

  const addAddressToAllowlist = async (allowlistId: string, address: string) => {
    if (!validateWalletAddress(address)) {
      toast.error('Invalid wallet address');
      return;
    }

    setIsAddingAddress(true);
    try {
      // Get the cap ID for this allowlist
      const caps = await suiClient.getOwnedObjects({
        owner: user.address,
        options: { showContent: true, showType: true },
        filter: { StructType: `${TESTNET_PACKAGE_ID}::allowlist::Cap` },
      });

      const capId = caps.data
        .map((cap) => {
          const capFields = (cap?.data?.content as { fields: any })?.fields;
          return {
            id: capFields?.id.id,
            allowlist_id: capFields?.allowlist_id,
          };
        })
        .filter((item) => item.allowlist_id === allowlistId)
        .map((item) => item.id)[0] as string;

      if (!capId) {
        throw new Error('Cannot find capability for this allowlist');
      }

      const tx = new Transaction();
      tx.moveCall({
        target: `${TESTNET_PACKAGE_ID}::allowlist::add`,
        arguments: [tx.object(allowlistId), tx.object(capId), tx.pure.address(address.trim())],
      });
      tx.setGasBudget(10000000);

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: (result: any) => {
            console.log('Added address to allowlist:', address, result);
            toast.success('Address added to allowlist successfully!');
            setNewAddress('');
            loadAllowlists(); // Reload to show updated addresses
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
    } finally {
      setIsAddingAddress(false);
    }
  };

  const removeAddressFromAllowlist = async (allowlistId: string, address: string) => {
    setIsRemovingAddress(true);
    try {
      // Get the cap ID for this allowlist
      const caps = await suiClient.getOwnedObjects({
        owner: user.address,
        options: { showContent: true, showType: true },
        filter: { StructType: `${TESTNET_PACKAGE_ID}::allowlist::Cap` },
      });

      const capId = caps.data
        .map((cap) => {
          const capFields = (cap?.data?.content as { fields: any })?.fields;
          return {
            id: capFields?.id.id,
            allowlist_id: capFields?.allowlist_id,
          };
        })
        .filter((item) => item.allowlist_id === allowlistId)
        .map((item) => item.id)[0] as string;

      if (!capId) {
        throw new Error('Cannot find capability for this allowlist');
      }

      const tx = new Transaction();
      tx.moveCall({
        target: `${TESTNET_PACKAGE_ID}::allowlist::remove`,
        arguments: [tx.object(allowlistId), tx.object(capId), tx.pure.address(address.trim())],
      });
      tx.setGasBudget(10000000);

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: (result: any) => {
            console.log('Removed address from allowlist:', address, result);
            toast.success('Address removed from allowlist successfully!');
            loadAllowlists(); // Reload to show updated addresses
          },
          onError: (error: any) => {
            console.error('Failed to remove address:', address, error);
            toast.error('Failed to remove address: ' + error.message);
          }
        }
      );

    } catch (error) {
      console.error('Failed to remove address from allowlist:', error);
      toast.error('Failed to remove address: ' + (error as Error).message);
    } finally {
      setIsRemovingAddress(false);
    }
  };

  const createNewAllowlist = async () => {
    try {
      if (!user?.address) {
        toast.error('Connect wallet to create allowlist');
        return;
      }
      const tx = new Transaction();
      tx.moveCall({
        target: `${TESTNET_PACKAGE_ID}::allowlist::create_allowlist_entry`,
        arguments: [tx.pure.string('Personal Allowlist')],
      });
      tx.setGasBudget(10000000);
      const res: any = await new Promise((resolve, reject) => {
        signAndExecute({ transaction: tx as any }, { onSuccess: resolve, onError: reject });
      });
      const created = res?.effects?.created || [];
      const shared = created.find((it: any) => it.owner && typeof it.owner === 'object' && 'Shared' in it.owner);
      const allowlistId: string | null = shared?.reference?.objectId || null;
      const capObj = created.find((it: any) => typeof it?.reference?.type === 'string' && it.reference.type.includes('::allowlist::Cap'));
      const capId = capObj?.reference?.objectId;
      if (!allowlistId || !capId) {
        toast.error('Failed to create allowlist');
        return;
      }
      const addTx = new Transaction();
      addTx.moveCall({
        target: `${TESTNET_PACKAGE_ID}::allowlist::add`,
        arguments: [addTx.object(allowlistId), addTx.object(capId), addTx.pure.address(user.address)],
      });
      addTx.setGasBudget(10000000);
      await new Promise((resolve, reject) => {
        signAndExecute({ transaction: addTx as any }, { onSuccess: () => resolve(true), onError: reject });
      });
      toast.success('Allowlist created and address added');
      setAllowlists(prev => [{ id: allowlistId, name: 'Personal Allowlist', addresses: [user.address], fileCount: 0, createdAt: new Date().toLocaleDateString() }, ...prev]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create allowlist');
    }
  };

  const getAllowlistViewerLink = (allowlistId: string) => {
    return `${window.location.origin}/allowlist/${allowlistId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading allowlists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Allowlists</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadAllowlists} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Allowlists</h2>
        <Button 
          onClick={createNewAllowlist}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Allowlist
        </Button>
      </div>

      {allowlists.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Allowlists Found</h3>
          <p className="text-gray-600 mb-4">
            You haven't created any allowlists yet. Create your first allowlist to start sharing files securely.
          </p>
          <Button 
            onClick={createNewAllowlist}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Allowlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allowlists.map((allowlist) => (
            <div key={allowlist.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{allowlist.name}</h3>
                  <p className="text-sm text-gray-500">Created: {allowlist.createdAt}</p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedAllowlist(allowlist);
                    setShowManageModal(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Files:</span>
                  <span className="font-medium">{allowlist.fileCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Addresses:</span>
                  <span className="font-medium">{allowlist.addresses.length}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  onClick={() => window.open(getAllowlistViewerLink(allowlist.id), '_blank')}
                  className="w-full"
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Allowlist
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(getAllowlistViewerLink(allowlist.id));
                    toast.success('Allowlist link copied to clipboard!');
                  }}
                  className="w-full"
                  variant="outline"
                >
                  Copy Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manage Modal */}
      {showManageModal && selectedAllowlist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage: {selectedAllowlist.name}
                </h3>
                <Button
                  onClick={() => setShowManageModal(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add New Wallet Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button
                      onClick={() => addAddressToAllowlist(selectedAllowlist.id, newAddress)}
                      disabled={!newAddress.trim() || !validateWalletAddress(newAddress) || isAddingAddress}
                      size="sm"
                    >
                      {isAddingAddress ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                  {newAddress && !validateWalletAddress(newAddress) && (
                    <p className="text-red-500 text-xs mt-1">Invalid wallet address</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Addresses ({selectedAllowlist.addresses.length})
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                    {selectedAllowlist.addresses.length === 0 ? (
                      <p className="p-3 text-gray-500 text-sm">No addresses added yet</p>
                    ) : (
                      selectedAllowlist.addresses.map((address, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-sm font-mono text-gray-700">
                            {address.slice(0, 6)}...{address.slice(-4)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            <Button
                              onClick={() => removeAddressFromAllowlist(selectedAllowlist.id, address)}
                              disabled={isRemovingAddress}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(getAllowlistViewerLink(selectedAllowlist.id));
                      toast.success('Allowlist link copied to clipboard!');
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    Copy Allowlist Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
