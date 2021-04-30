// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract PriceFeedMock is AggregatorV3Interface {

    int _dollarValue;
    constructor(int dollarValue){
        _dollarValue = dollarValue;
    }

    function decimals() external view override returns (uint8){
        return 8;
    }

    function description() external view override returns (string memory){
        return "Mock Description";
    }

    function version() external view override returns (uint256){
        return 1;
    }

    function getRoundData(uint80 _roundId)
    external
    view
    override
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ){
        return (1, _dollarValue * 10 ** 8, 1, 1, 1);
    }

    function latestRoundData()
    external
    view
    override
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ){
        return (1, _dollarValue * 10 ** 8, 1, 1, 1);
    }
}
