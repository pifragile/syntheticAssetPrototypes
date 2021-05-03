/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-ethers")
require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-web3")
require("dotenv").config()

module.exports = {
    networks: {
        kovan: {
            url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
            accounts: [`0x${process.env.KOVAN_PRIVATE_KEY}`]
        }
    },
    solidity: "0.8.0",
};


task("deploy:virtuals", "Deploys the Virtuals smart contract")
    .setAction(async taskArgs => {
        const Virtuals = await ethers.getContractFactory("Virtuals")
        const virtuals = await Virtuals.deploy()
        await virtuals.deployed()
        console.log("Virtuals deployed to:", virtuals.address)
        // Link price feed
        await virtuals.addOrUpdatePriceFeed('VRT', '0x396c5E36DD0a0F5a5D33dae44368D4193f69a1F0')
        await virtuals.addOrUpdatePriceFeed('BTC', '0x6135b13325bfC4B00278B4abC5e20bbce2D6580e')
        console.log('attached price feeds')
    });
