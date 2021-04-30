// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


/**
 * @dev vla
 */

contract Virtuals is ERC20 {
    using SafeMath for uint256;

    mapping(address => mapping(address => uint256)) private _allowances;

    // address -> asset -> amount
    mapping(address => mapping(string => uint256)) private _positions;

    // maps an asset string representation like BTC to an oracle address
    // all oracle price data has to be represented in USD
    mapping(string => AggregatorV3Interface) private _priceFeeds;

    address owner;

    uint8 private _fee;
    // every asset can be broken down into 1/18
    uint256 private _assetDecimals = 18;
    uint256 private _assetDecimalDivisor = 10 ** _assetDecimals;


    constructor() ERC20("Virtuals", "VRT"){
        owner = msg.sender;
        // transaction fee in base points
        _fee = 30;
        // initial supply is 100m tokens
        _mint(msg.sender, 10 ** decimals() * 100000000);
    }
    modifier _ownerOnly(){
        require(msg.sender == owner, "you are not the owner");
        _;
    }

    function addOrUpdatePriceFeed(string memory asset, address priceFeedAddress) _ownerOnly public {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        _priceFeeds[asset] = priceFeed;

    }

    function positionOf(address account, string memory asset) view public returns (uint256) {
        return _positions[account][asset];
    }

    function _getPriceAndDecimals(string memory asset) view private returns (uint256, uint256){
        AggregatorV3Interface priceFeed = _priceFeeds[asset];
        (,int priceSigned,,,) = priceFeed.latestRoundData();
        require(priceSigned > 0);
        uint256 assetPrice = uint256(priceSigned);
        uint256 assetPriceDecimals = priceFeed.decimals();
        return (assetPrice, assetPriceDecimals);
    }

    function _getVRTPriceAndDecimals() view private returns (uint256, uint256){
        return _getPriceAndDecimals(symbol());
    }

    function _payFee(address payer, uint256 amount) private {
        // round up
        uint256 fee = ((amount + 9999) / 10000) * _fee;
        require(balanceOf(payer) >= fee, "not enough balance to pay fee");
        _transfer(payer, owner, fee);
    }

    /**
    * @dev Let assetWei and VRTWei be the smallest units that an asset/VRT can be divided into (defined by _assetDecimals and _decimals respectively).
    * Calculates the price of amount assetWei in VRTWei.
    * If it will become clear that _assetDecimals == _decimals, this calculation could be simplified a little.
    */
    function _getAssetPriceInVRT(string memory asset, uint256 amount) private view returns (uint256){
        (uint256 assetPrice, uint256 assetPriceDecimals) = _getPriceAndDecimals(asset);
        (uint256 VRTPrice, uint256 VRTPriceDecimals) = _getVRTPriceAndDecimals();

        // 10**_decimals VRT = VRTPrice / 10**VRTPriceDecimals USD
        // 10**_assetDecimals asset = assetPrice / 10**assetPriceDecimals USD
        // 1 VRTWei = ( VRTPrice / 10**VRTPriceDecimals ) / 10**_decimals = VRTPrice / ( 10**VRTPriceDecimals * 10**_decimals ) USD
        // 1 assetWei = ( assetPrice / 10**assetPriceDecimals ) / 10**_assetDecimals = assetPrice / ( 10**assetPriceDecimals * 10**_assetDecimals ) USD

        // 1 assetWei = ( assetPrice / ( 10**assetPriceDecimals * 10**_assetDecimals )  ) / ( VRTPrice / ( 10**VRTPriceDecimals * 10**_decimals ) ) VRTWei
        // 1 assetWei = ( assetPrice * 10**VRTPriceDecimals * 10**_decimals ) / ( VRTPrice* 10**assetPriceDecimals * 10**_assetDecimals ) VRTWei

        uint256 numerator = amount * assetPrice * 10 ** VRTPriceDecimals * 10 ** decimals();
        uint256 denominator = VRTPrice * 10 ** assetPriceDecimals * 10 ** _assetDecimals;

        // round up
        uint256 price = (numerator + denominator - 1) / denominator;
        return price;
    }


    function buy(string memory asset, uint256 amount) public {
        uint256 price = _getAssetPriceInVRT(asset, amount);
        _burn(msg.sender, price);
        _payFee(msg.sender, price);
        _positions[msg.sender][asset] = _positions[msg.sender][asset].add(amount);
    }

    function sell(string memory asset, uint256 amount) public {
        uint256 price = _getAssetPriceInVRT(asset, amount);
        _positions[msg.sender][asset] = _positions[msg.sender][asset].sub(amount, "not enough assets to sell");
        _payFee(msg.sender, price);
        _mint(msg.sender, price);
    }
}
