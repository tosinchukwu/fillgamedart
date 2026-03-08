// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract FillGameVictoryNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;

    address public tournamentContract;
    string public baseTokenURI;  // ← more conventional name

    // ──────────────────────────────────────────────
    // Events & Errors
    // ──────────────────────────────────────────────

    event VictoryNFTMinted(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 indexed matchId
    );

    error NotAuthorizedToMint();
    error InvalidAddress();
    error NotTokenOwnerNorAdmin();

    constructor(
        string memory _baseTokenUri
    )
        ERC721("FillGame Victory", "FGV")
        Ownable(msg.sender)
    {
        baseTokenURI = _baseTokenUri;
        // tournamentContract is set later via setter
    }

    // ──────────────────────────────────────────────
    // Mint – only callable by the tournament contract
    // ──────────────────────────────────────────────

    function mintVictoryNft(address to, uint256 matchId)
        external
        returns (uint256)
    {
        if (msg.sender != tournamentContract) {
            revert NotAuthorizedToMint();
        }

        uint256 tokenId = _nextTokenId++;

        _safeMint(to, tokenId);

        // Build metadata URI: base + tokenId + ".json"
        string memory uri = string(
            abi.encodePacked(_baseURI(), Strings.toString(tokenId), ".json")
        );

        _setTokenURI(tokenId, uri);

        emit VictoryNFTMinted(tokenId, to, matchId);

        return tokenId;
    }

    // ──────────────────────────────────────────────
    // Tournament linking (critical authorization!)
    // ──────────────────────────────────────────────

    function setTournamentContract(address _tournament) external onlyOwner {
        if (_tournament == address(0)) revert InvalidAddress();
        tournamentContract = _tournament;
    }

    // ──────────────────────────────────────────────
    // Internal utils
    // ──────────────────────────────────────────────

    /**
     * @dev Base URI for computing {tokenURI}
     */
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    // ──────────────────────────────────────────────
    // Optional: allow holder or admin to burn
    // ──────────────────────────────────────────────

    function burn(uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != tokenOwner && msg.sender != owner()) {
            revert NotTokenOwnerNorAdmin();
        }
        _burn(tokenId);
    }

    // ──────────────────────────────────────────────
    // Required overrides – fix diamond inheritance conflict
    // ──────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     *      Delegates to ERC721URIStorage implementation.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
