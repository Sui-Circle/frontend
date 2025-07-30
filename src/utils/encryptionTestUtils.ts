/**
 * Utility functions for testing encryption functionality
 */

import { sealEncryptionService } from '../services/sealEncryptionService';

/**
 * Create a test file for encryption testing
 */
export const createTestFile = (content: string, filename: string = 'test.txt'): File => {
  const blob = new Blob([content], { type: 'text/plain' });
  return new File([blob], filename, { type: 'text/plain' });
};

/**
 * Test the encryption and decryption cycle
 */
export const testEncryptionCycle = async (testContent: string = 'Hello, this is a test file for encryption!'): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('🧪 Starting encryption cycle test...');

    // Initialize the service
    await sealEncryptionService.initialize();
    
    if (!sealEncryptionService.isReady()) {
      return {
        success: false,
        message: 'Encryption service not ready'
      };
    }

    // Create test file
    const testFile = createTestFile(testContent, 'encryption-test.txt');
    console.log(`📁 Created test file: ${testFile.name} (${testFile.size} bytes)`);

    // Encrypt the file
    console.log('🔐 Encrypting file...');
    const encryptionResult = await sealEncryptionService.encryptFile(testFile);
    
    if (!encryptionResult.success) {
      return {
        success: false,
        message: `Encryption failed: ${encryptionResult.error}`,
        details: encryptionResult
      };
    }

    console.log('✅ File encrypted successfully');
    console.log(`🔑 Public Key: ${encryptionResult.publicKey}`);
    console.log(`🔐 Secret Key: ${encryptionResult.secretKey}`);

    // Decrypt the file
    console.log('🔓 Decrypting file...');
    const decryptionResult = await sealEncryptionService.decryptFile(
      encryptionResult.encryptedData!,
      encryptionResult.secretKey!
    );

    if (!decryptionResult.success) {
      return {
        success: false,
        message: `Decryption failed: ${decryptionResult.error}`,
        details: { encryptionResult, decryptionResult }
      };
    }

    // Verify the decrypted content
    const decryptedContent = new TextDecoder().decode(decryptionResult.decryptedData!);
    const contentMatches = decryptedContent === testContent;

    console.log('✅ File decrypted successfully');
    console.log(`📄 Original content: "${testContent}"`);
    console.log(`📄 Decrypted content: "${decryptedContent}"`);
    console.log(`✅ Content matches: ${contentMatches}`);

    if (!contentMatches) {
      return {
        success: false,
        message: 'Decrypted content does not match original',
        details: {
          original: testContent,
          decrypted: decryptedContent,
          encryptionResult,
          decryptionResult
        }
      };
    }

    return {
      success: true,
      message: 'Encryption cycle test completed successfully!',
      details: {
        originalSize: testFile.size,
        encryptedSize: encryptionResult.encryptedData!.length,
        decryptedSize: decryptionResult.decryptedData!.length,
        publicKey: encryptionResult.publicKey,
        secretKey: encryptionResult.secretKey,
        metadata: encryptionResult.metadata
      }
    };

  } catch (error) {
    console.error('❌ Encryption cycle test failed:', error);
    return {
      success: false,
      message: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    };
  }
};

/**
 * Test encryption service status
 */
export const testEncryptionServiceStatus = async (): Promise<{
  success: boolean;
  status: any;
  message: string;
}> => {
  try {
    console.log('🔍 Checking encryption service status...');

    const status = sealEncryptionService.getStatus();
    console.log('📊 Service status:', status);

    if (!status.isInitialized) {
      console.log('🔄 Initializing service...');
      await sealEncryptionService.initialize();
    }

    const finalStatus = sealEncryptionService.getStatus();
    
    return {
      success: finalStatus.isReady,
      status: finalStatus,
      message: finalStatus.isReady 
        ? 'Encryption service is ready' 
        : 'Encryption service is not ready'
    };

  } catch (error) {
    console.error('❌ Service status check failed:', error);
    return {
      success: false,
      status: sealEncryptionService.getStatus(),
      message: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Run all encryption tests
 */
export const runAllEncryptionTests = async (): Promise<{
  success: boolean;
  results: any[];
  summary: string;
}> => {
  console.log('🚀 Running all encryption tests...');
  
  const results = [];

  // Test 1: Service Status
  console.log('\n📋 Test 1: Service Status');
  const statusTest = await testEncryptionServiceStatus();
  results.push({ test: 'Service Status', ...statusTest });

  // Test 2: Basic Encryption Cycle
  console.log('\n📋 Test 2: Basic Encryption Cycle');
  const basicTest = await testEncryptionCycle();
  results.push({ test: 'Basic Encryption Cycle', ...basicTest });

  // Test 3: Large Content Encryption
  console.log('\n📋 Test 3: Large Content Encryption');
  const largeContent = 'A'.repeat(10000); // 10KB of 'A's
  const largeTest = await testEncryptionCycle(largeContent);
  results.push({ test: 'Large Content Encryption', ...largeTest });

  // Test 4: Special Characters
  console.log('\n📋 Test 4: Special Characters Encryption');
  const specialContent = '🔐 Special chars: áéíóú ñ 中文 🚀 @#$%^&*()';
  const specialTest = await testEncryptionCycle(specialContent);
  results.push({ test: 'Special Characters', ...specialTest });

  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;

  const summary = `Tests completed: ${successCount}/${totalTests} passed`;
  console.log(`\n📊 ${summary}`);

  return {
    success: successCount === totalTests,
    results,
    summary
  };
};

// Export for console testing
(window as any).encryptionTestUtils = {
  createTestFile,
  testEncryptionCycle,
  testEncryptionServiceStatus,
  runAllEncryptionTests
};
