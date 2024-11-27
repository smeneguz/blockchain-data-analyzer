test

npm run dev -- analyze -a <ethereum_address> -n <organization_name> --include-internal --include-tokens

Starting with DAO Maker:
address: 0x0f51bb10119727a7e5eA3538074fb341F56B09Ad

npm run dev -- analyze -a 0x0f51bb10119727a7e5eA3538074fb341F56B09Ad -n DAO_Maker --include-internal --include-tokens


# Blockchain Data Analyzer

A TypeScript/Node.js tool for analyzing blockchain data from Etherscan, specifically designed for researching DAO (Decentralized Autonomous Organization) activities and transactions.

## Overview

This tool allows you to:
- Retrieve and analyze normal transactions for specific addresses
- Collect internal transactions
- Track token transfers
- Store data in organized CSV files for further analysis
- Resume interrupted data collection

## Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)
- An Etherscan API key ([Get one here](https://etherscan.io/apis))

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd blockchain-data-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
ETHERSCAN_API_KEY=your_api_key_here
ETHERSCAN_NETWORK=mainnet
STORAGE_BASE_DIR=./data
LOG_LEVEL=info
```

## Usage

### Basic Command Structure
```bash
npm run dev -- analyze -a <address> -n <name> [options]
```

### Command Options
- `-a, --address`: The Ethereum address to analyze (required)
- `-n, --name`: Name for the organization/entity (required)
- `--include-internal`: Include internal transactions
- `--include-tokens`: Include token transfers
- `--resume`: Resume from last processed block

### Examples

1. Basic address analysis:
```bash
npm run dev -- analyze -a 0x0f51bb10119727a7e5eA3538074fb341F56B09Ad -n DAO_Maker
```

2. Complete analysis including internal transactions and token transfers:
```bash
npm run dev -- analyze -a 0x0f51bb10119727a7e5eA3538074fb341F56B09Ad -n DAO_Maker --include-internal --include-tokens
```

3. Resume interrupted analysis:
```bash
npm run dev -- analyze -a 0x0f51bb10119727a7e5eA3538074fb341F56B09Ad -n DAO_Maker --include-internal --include-tokens --resume
```

## Output Structure

The tool creates a structured data directory:
```
data/
├── organizations/
│   └── [organization_name]/
│       ├── metadata.json
│       ├── state.json
│       ├── transactions/
│       │   ├── normal.csv
│       │   └── internal.csv
│       └── transfers/
│           └── token_transfers.csv
└── registry.json
```

### Data Files
- `normal.csv`: Regular transactions
- `internal.csv`: Internal transactions
- `token_transfers.csv`: Token transfer events
- `metadata.json`: Organization information
- `state.json`: Processing state for resume capability

## Technical Details

### Architecture
The project follows a clean architecture pattern with the following structure:
```
src/
├── core/
│   ├── entities/
│   └── interfaces/
├── application/
│   └── services/
├── infrastructure/
│   ├── api/
│   ├── persistence/
│   └── logging/
└── presentation/
    └── cli/
```

### Rate Limiting
The tool respects Etherscan's API limits:
- 5 calls per second
- Maximum of 100,000 records per query
- Implements exponential backoff for rate limit handling

### Error Handling
- Network error recovery
- Rate limit handling
- Resumable operations
- Detailed error logging

## Development

### Building the Project
```bash
npm run build
```

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Limitations

- Maximum of 10,000 transactions per query from Etherscan
- Rate limited to 5 calls per second
- Some historical data might be incomplete due to blockchain indexing limitations

## API Integration

The tool currently supports:
- Etherscan API for Ethereum Mainnet
- Optionally supports other networks (Goerli, Sepolia, Polygon)

For API endpoints documentation, please refer to [Etherscan API Documentation](https://docs.etherscan.io/).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Future Improvements

- Support for multiple addresses per organization
- Enhanced data analysis features
- Additional blockchain network support
- Web interface for data visualization
- Batch processing capabilities
- Extended DAO-specific analytics

## Acknowledgments

- Etherscan for providing the API
- OpenZeppelin for security patterns
- The DAO research community

## Support

For support, please open an issue in the repository or contact meneguzzosilvio@gmail.com.