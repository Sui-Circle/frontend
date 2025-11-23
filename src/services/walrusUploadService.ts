import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { walrus, WalrusClient } from '@mysten/walrus';
import { WalrusFile } from '@mysten/walrus';

/**
 * Walrus SDK Service
 * Setup according to: https://sdk.mystenlabs.com/walrus
 */

// Create Walrus client with testnet configuration (direct upload)
export const createWalrusClient = () => {
  const client = new WalrusClient({
    network: 'testnet',
    suiRpcUrl: getFullnodeUrl('testnet'),
  });

  return client;
};

// Create Walrus client with custom package configuration
export const createWalrusClientWithCustomConfig = () => {
  const client = new WalrusClient({
    network: 'testnet',
    suiRpcUrl: getFullnodeUrl('testnet'),
    packageConfig: {
      systemObjectId: '0x98ebc47370603fe81d9e15491b2f1443d619d1dab720d586e429ed233e1255c1',
      stakingPoolId: '0x20266a17b4f1a216727f3eef5772f8d486a9e3b5e319af80a5b75809c035561d',
    },
  });

  return client;
};

// Create Walrus client with custom fetch options
export const createWalrusClientWithCustomFetch = () => {
  const client = new WalrusClient({
    network: 'testnet',
    suiRpcUrl: getFullnodeUrl('testnet'),
    storageNodeClientOptions: {
      fetch: (url, options) => {
        console.log('fetching', url);
        return fetch(url, options);
      },
      timeout: 60_000,
    },
  });

  return client;
};

// Create Walrus client with upload relay
export const createWalrusClientWithUploadRelay = () => {
  const client = new WalrusClient({
    network: 'testnet',
    suiRpcUrl: getFullnodeUrl('testnet'),
    uploadRelay: {
      host: 'https://upload-relay.testnet.walrus.space',
      sendTip: {
        max: 1_000,
      },
    },
  });

  return client;
};

/**
 * Read files from Walrus
 * Accepts both Blob IDs and Quilt IDs
 */
export const getWalrusFiles = async (client: WalrusClient, ids: string[]) => {
  const files = await client.getFiles({ ids });
  return files;
};

/**
 * Get a single blob from Walrus
 */
export const getWalrusBlob = async (client: WalrusClient, blobId: string) => {
  const blob = await client.getBlob({ blobId });
  return blob;
};

/**
 * Create WalrusFile from various content types
 */
export const createWalrusFile = ({
  contents,
  identifier,
  tags,
}: {
  contents: Uint8Array | Blob | string;
  identifier: string;
  tags?: Record<string, string>;
}) => {
  let processedContents: Uint8Array | Blob;

  if (typeof contents === 'string') {
    processedContents = new TextEncoder().encode(contents);
  } else {
    processedContents = contents;
  }

  return WalrusFile.from({
    contents: processedContents,
    identifier,
    tags,
  });
};

/**
 * Write files to Walrus (simplified method)
 * Note: This requires a proper Signer (Ed25519Keypair)
 * For browser wallets, use writeFilesFlow instead
 */
export const writeFilesToWalrus = async ({
  client,
  files,
  epochs,
  deletable = true,
  signer,
}: {
  client: WalrusClient;
  files: ReturnType<typeof createWalrusFile>[];
  epochs: number;
  deletable?: boolean;
  signer: any; // Ed25519Keypair or compatible signer
}) => {
  const results = await client.writeFiles({
    files,
    epochs,
    deletable,
    signer,
  });

  return results;
};

/**
 * Write files flow for browser environments
 * Breaks the write process into separate steps to avoid popup blockers
 */
export const createWriteFilesFlow = ({
  client,
  files,
}: {
  client: WalrusClient;
  files: ReturnType<typeof createWalrusFile>[];
}) => {
  const flow = client.writeFilesFlow({ files });
  return flow;
};

/**
 * Execute write files flow steps
 */
export const executeWriteFilesFlow = async ({
  flow,
  epochs,
  owner,
  deletable = true,
  signAndExecuteTransaction,
}: {
  flow: ReturnType<WalrusClient['writeFilesFlow']>;
  epochs: number;
  owner: string;
  deletable?: boolean;
  signAndExecuteTransaction: (params: { transaction: any }) => Promise<{ digest: string }>;
}) => {
  // Step 1: Encode files
  await flow.encode();

  // Step 2: Register the blob
  const registerTx = flow.register({
    epochs,
    owner,
    deletable,
  });
  const { digest } = await signAndExecuteTransaction({ transaction: registerTx });

  // Step 3: Upload to storage nodes
  await flow.upload({ digest });

  // Step 4: Certify the blob
  const certifyTx = flow.certify();
  await signAndExecuteTransaction({ transaction: certifyTx });

  // Step 5: Get the uploaded files
  const uploadedFiles = await flow.listFiles();

  return uploadedFiles;
};

/**
 * Upload encrypted bytes to Walrus with user wallet signing
 * User's wallet will be prompted to approve transactions
 * Note: User needs WAL tokens in their wallet for storage fees
 */
export const uploadEncryptedBytes = async (
  client: WalrusClient,
  bytes: Uint8Array,
  epochs: number,
  owner: string,
  signAndExecuteTransaction: any,
  deletable: boolean = false
) => {
  const file = WalrusFile.from({
    contents: bytes,
    identifier: 'encrypted-file',
  });

  console.log('📤 Starting Walrus upload via user wallet...');
  console.log('📊 File size:', bytes.length, 'bytes');
  console.log('⏱️  Storage epochs:', epochs);
  console.log('👤 Owner address:', owner);

  // Use writeFilesFlow for browser wallet integration
  const flow = client.writeFilesFlow({ files: [file] });

  // Step 1: Encode the files
  console.log('1️⃣ Encoding files...');
  await flow.encode();

  // Step 2: Register - user signs this transaction
  console.log('2️⃣ Creating register transaction...');
  const registerTx = flow.register({
    epochs,
    owner,
    deletable,
  });

  const registerResult = await new Promise<{ digest: string }>((resolve, reject) => {
    console.log('✍️  Requesting wallet signature for REGISTER transaction...');
    signAndExecuteTransaction(
      { transaction: registerTx },
      {
        onSuccess: (result: any) => {
          console.log('✅ Register transaction signed and executed!');
          console.log('   Transaction digest:', result.digest);
          resolve({ digest: result.digest });
        },
        onError: (error: any) => {
          console.error('❌ Register transaction failed:', error);
          reject(error);
        },
      }
    );
  });

  // Step 3: Upload to storage nodes
  console.log('3️⃣ Uploading to Walrus storage nodes...');
  await flow.upload({ digest: registerResult.digest });
  console.log('✅ Upload to storage nodes complete!');

  // Step 4: Certify - user signs this transaction
  console.log('4️⃣ Creating certify transaction...');
  const certifyTx = flow.certify();

  await new Promise<void>((resolve, reject) => {
    console.log('✍️  Requesting wallet signature for CERTIFY transaction...');
    signAndExecuteTransaction(
      { transaction: certifyTx },
      {
        onSuccess: (result: any) => {
          console.log('✅ Certify transaction signed and executed!');
          console.log('   Transaction digest:', result.digest);
          resolve();
        },
        onError: (error: any) => {
          console.error('❌ Certify transaction failed:', error);
          reject(error);
        },
      }
    );
  });

  // Step 5: Get results
  console.log('5️⃣ Retrieving upload results...');
  const results = await flow.listFiles();
  const uploadedFile = results[0];

  console.log('✅ Walrus upload complete!');
  console.log('🔗 Blob ID:', uploadedFile.blobId);
  
  return uploadedFile;
};

// Helper to create Walrus client from existing SuiClient
export const createWalrusClientFromSuiClient = (suiClient?: any) => {
  // Use WalrusClient directly instead of extending SuiClient
  return createWalrusClient();
};

// Default export: create a standard Walrus client instance
export default createWalrusClient();