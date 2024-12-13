export const ENSConfig: DAOConfig = {
    name: 'ENS DAO',
    description: 'Ethereum Name Service DAO',
    network: 'mainnet',
    contracts: [
      {
        address: '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3',
        type: 'governor',
        name: 'ENS Governor',
        startBlock: 13696000
      },
      {
        address: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
        type: 'token',
        name: 'ENS Token',
        startBlock: 13696000
      }
    ]
  };