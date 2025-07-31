import { testnet } from './contract_testnet';

interface ContractConfig {
    [key: string]: string;
}

export function getContractConfig(): ContractConfig {
    try {
        // Load testnet contract configuration
        return testnet as unknown as ContractConfig;
    } catch (error) {
        console.error('Failed to load testnet config', { cause: error });
        return {};
    }
}
