// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


/**
 * @dev bla
 */

contract Casino {
    using SafeMath for uint256;

    struct Position {
        uint256 amount;
        uint256 averagePrice;
    }

    address owner;
    uint256 public poolBalance;
    // every asset can be broken down into 1/18
    uint256 private _assetDecimalDivisor = 10**18;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _lockedBalances;

    // address -> asset -> Position
    mapping(address => mapping(string => Position)) private _positions;

    // maps an asset string representation like BTC to an oracle address
    // all oracle price data has to be represented in ETH
    mapping(string => AggregatorV3Interface) private _priceFeeds;


    uint8 private _fee;

    constructor() {
        owner = msg.sender;
        // transaction fee in base points
        _fee = 30;
    }

    modifier _ownerOnly(){
        require(msg.sender == owner);
        _;
    }

    function addOrUpdatePriceFeed(string memory asset, address priceFeedAddress) _ownerOnly public {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        require(priceFeed.decimals() == 18, "invalid priceFeed");
        _priceFeeds[asset] = priceFeed;

    }

    function deposit() public payable {
        _balances[msg.sender] += msg.value;
    }

    function _payFee(address payer, uint256 amount) private {
        // round up
        uint256 fee = ((amount + 9999) / 10000) * _fee;
        _balances[payer].sub(fee, "not enough balance to pay fee");
        poolBalance.add(fee);
    }

    function _getPrice(string memory asset) view private returns (uint256 price){
        AggregatorV3Interface priceFeed = _priceFeeds[asset];
        (,int priceSigned,,,) = priceFeed.latestRoundData();
        require(priceSigned > 0);
        price = uint256(priceSigned);
    }

    function buy(string memory asset, uint256 amount) public payable {
        _balances[msg.sender] += msg.value;

        (uint256 assetPrice) = _getPrice(asset);
        Position storage position = _positions[msg.sender][asset];

        // round up
        uint256 price = (assetPrice * amount) + _assetDecimalDivisor - 1 /  _assetDecimalDivisor;

        _balances[msg.sender].sub(price, "Not enough balance to buy asset");
        _lockedBalances[msg.sender].add(price);
        _payFee(msg.sender, price);
        uint256 positionAmount = position.amount;
        position.averagePrice = (positionAmount * position.averagePrice + assetPrice * amount) / (positionAmount + amount);
        position.amount.add(amount);
    }


    function sell(string memory asset, uint256 amount, bool force) public {
        (uint256 assetPrice) = _getPrice(asset);
        Position storage position = _positions[msg.sender][asset];
        position.amount.sub(amount, "not enough asset available");
        uint256 positionAveragePrice = position.averagePrice;

        if (assetPrice > position.averagePrice) {
            // gain
            _payFee(msg.sender, (assetPrice * amount) / _assetDecimalDivisor);
            uint256 gainPerAsset = assetPrice - positionAveragePrice;
            uint256 totalGain = gainPerAsset * amount / _assetDecimalDivisor;
            // if force it set to true it will force the sell even if not all gains can be realized.
            if (poolBalance < totalGain && force) {
                totalGain = poolBalance;
                poolBalance = 0;
            }
            poolBalance.sub(totalGain, "not enough pool balance to cash out gains");
            uint256 unlockAmount = (positionAveragePrice * amount) / _assetDecimalDivisor;
            _lockedBalances[msg.sender].sub(unlockAmount, "something went terribly wrong");
            _balances[msg.sender].add(unlockAmount + totalGain);
        } else {
            // loss
            _payFee(msg.sender, (assetPrice * amount) / _assetDecimalDivisor);
            uint256 lossPerAsset = positionAveragePrice - assetPrice;
            uint256 totalLoss = lossPerAsset * amount / _assetDecimalDivisor;
            poolBalance.add(totalLoss);
            uint256 unlockAmount = (positionAveragePrice * amount) / _assetDecimalDivisor;
            _lockedBalances[msg.sender].sub(unlockAmount);
            _balances[msg.sender].add(unlockAmount - totalLoss);
        }
    }
}
