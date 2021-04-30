const {expect} = require("chai");

let priceFeed600, priceFeed400, priceFeedVRT, virtuals

async function setupContracts() {
    const PriceFeed600 = await ethers.getContractFactory("PriceFeedMock")
    priceFeed600 = await PriceFeed600.deploy(600)
    await priceFeed600.deployed()

    const PriceFeed400 = await ethers.getContractFactory("PriceFeedMock")
    priceFeed400 = await PriceFeed400.deploy(400)
    await priceFeed400.deployed()

    const PriceFeedVRT = await ethers.getContractFactory("PriceFeedMock")
    priceFeedVRT = await PriceFeedVRT.deploy(50)
    await priceFeedVRT.deployed()

    const Virtuals = await ethers.getContractFactory("Virtuals")
    virtuals = await Virtuals.deploy()
    await virtuals.deployed()
}

describe("Virtuals", function () {
    beforeEach("setup Virtuals contract", setupContracts)


    it("should have name virtuals", async function () {
        expect(await virtuals.name()).to.be.equal("Virtuals");
    });

    it("should have 18 decimals", async function () {
        expect(await virtuals.decimals()).to.be.equal(18);
    });

    it("should have symbol VRT", async function () {
        expect(await virtuals.symbol()).to.be.equal("VRT");
    });

    it("addOrUpdatePriceFeed should only be callable by owner", async function () {
        const [owner, addr1] = await ethers.getSigners()
        expect(await virtuals.symbol()).to.be.equal("VRT");
        expect(virtuals.connect(addr1).addOrUpdatePriceFeed("BTC", priceFeed600.address)).to.be.revertedWith("you are not the owner")
    });

    it("have buy functionality", async function () {
        const [owner, addr1] = await ethers.getSigners()
        await virtuals.addOrUpdatePriceFeed("BTC", priceFeed600.address)
        await virtuals.addOrUpdatePriceFeed("VRT", priceFeedVRT.address)
        // addr1 wants to buy 0.5 btc which should cost him 300 dollars which is equal to 6 VRT
        // fee should be 0.3% of 6 VRT = 0.018 VRT

        // not enough VRT to burn
        try {
            await virtuals.connect(addr1).buy("BTC", String(5 * 10 ** 17))
        } catch(error) {
            expect(error.message).to.be.equal("VM Exception while processing transaction: revert ERC20: burn amount exceeds balance")
        }

        // transfer 6 VRT
        await virtuals.transfer(addr1.address, String(6 * 10**18))

        // not enough balance to pay the fee
        try {
            await virtuals.connect(addr1).buy("BTC", String(5 * 10 ** 17))
        } catch(error) {
            expect(error.message).to.be.equal("VM Exception while processing transaction: revert not enough balance to pay fee")
        }

        // transfer 0.018 VRT
        await virtuals.transfer(addr1.address, String(18 * 10**15))

        await virtuals.connect(addr1).buy("BTC", String(5 * 10 ** 17))

        expect(await virtuals.balanceOf(addr1.address)).to.be.equal(0);
        expect(await virtuals.positionOf(addr1.address, "BTC")).to.be.equal(String(5 * 10 ** 17));
    });

});

//     it("should have deposit functionality", async function () {
//         const [owner] = await ethers.getSigners()
//         await dollarpay.deposit({value: String(10 ** 18)})
//         expect(await getBalance(dollarpay.address)).to.be.equal(10 ** 18)
//         expect(parseInt(await dollarpay.balanceOf(owner.address))).to.be.equal(60000)
//     });
//
//     it("should be able to withdraw all funds", async function () {
//         const [owner, addr1] = await ethers.getSigners()
//         let balance = await getBalance(addr1.address)
//         let gasPrice, gasLimit
//         // deposit 1 ether
//         ({gasPrice, gasLimit} = await dollarpay.connect(addr1).deposit({value: "1000000000000000000"}))
//
//         let newBalance = await getBalance(addr1.address)
//         expect(newBalance).to.be.greaterThan(balance - 10 ** 18 - gasLimit * gasPrice)
//         expect(newBalance).to.be.lessThan(balance - 10 ** 18)
//
//         balance = await getBalance(addr1.address);
//         ({gasPrice, gasLimit} = await dollarpay.connect(addr1).withdrawAll())
//         newBalance = await getBalance(addr1.address)
//         expect(newBalance).to.be.greaterThan(balance + 10 ** 18 - gasLimit * gasPrice)
//         expect(newBalance).to.be.lessThan(balance + 10 ** 18)
//     });
//
//     it("should have functionality to set the latest Price", async function () {
//         const PriceFeed = await ethers.getContractFactory("RandomPriceFeedMock")
//         const priceFeed = await PriceFeed.deploy()
//         await priceFeed.deployed()
//
//         const GasPriceFeed = await ethers.getContractFactory("GasPriceFeedMock")
//         const gasPriceFeed = await GasPriceFeed.deploy()
//         await gasPriceFeed.deployed()
//
//         const Dollarpay = await ethers.getContractFactory("Dollarpay")
//         dollarpay = await Dollarpay.deploy(priceFeed.address, gasPriceFeed.address, String(10 ** 16))
//         await dollarpay.deployed()
//
//         const [owner] = await ethers.getSigners()
//         await dollarpay.deposit({value: String(10 ** 18)})
//         const balance = parseInt(await dollarpay.balanceOf(owner.address))
//         await dollarpay.setPriceMultiplier()
//         // balance should have changed due to priceMultiplier change.
//         expect(parseInt(await dollarpay.balanceOf(owner.address))).not.to.be.equal(balance)
//     });
//
//     it("should calculate total supply correctly", async function () {
//         const [owner] = await ethers.getSigners()
//         await dollarpay.deposit({value: String(10 ** 18)})
//         expect(parseInt(await dollarpay.totalSupply())).to.be.equal(60000)
//         await dollarpay.deposit({value: String(10 ** 18)})
//         expect(parseInt(await dollarpay.totalSupply())).to.be.equal(120000)
//     });
//
//     it("should calculate balanceOf supply correctly", async function () {
//         const [owner] = await ethers.getSigners()
//         await dollarpay.deposit({value: String(10 ** 18)})
//         expect(parseInt(await dollarpay.balanceOf(owner.address))).to.be.equal(60000)
//         await dollarpay.deposit({value: String(10 ** 18)})
//         expect(parseInt(await dollarpay.balanceOf(owner.address))).to.be.equal(120000)
//     });
//
//     it("should handle allowances correctly", async function () {
//         const [owner, account1] = await ethers.getSigners()
//         await dollarpay.deposit({value: String(10 ** 18)})
//         await dollarpay.approve(account1.address, 1000)
//         expect(parseInt(await dollarpay.allowance(owner.address, account1.address))).to.be.equal(1000);
//     });
//
//     it("should have transfer functionality", async function () {
//         const [owner, account1] = await ethers.getSigners()
//         await dollarpay.deposit({value: String(10 ** 18)})
//         await dollarpay.transfer(account1.address, 40000)
//         expect(parseInt(await dollarpay.balanceOf(account1.address))).to.be.equal(40000)
//         expect(parseInt(await dollarpay.balanceOf(owner.address))).to.be.equal(19400)
//         // fees payed are 0.01 ether which corresponds to 6 cents
//         expect(parseInt(await dollarpay.balanceOf('0x0000000000000000000000000000000000000000'))).to.be.equal(600)
//         await dollarpay.transfer(account1.address, 18800)
//         expect(parseInt(await dollarpay.balanceOf('0x0000000000000000000000000000000000000000'))).to.be.equal(1200)
//     });
//
//     it("should fail transfer if not enough balance", async function () {
//         const [owner, account1] = await ethers.getSigners()
//         await dollarpay.deposit({value: String(10 ** 18)})
//         expect(dollarpay.transfer(account1.address, 60001)).to.be.revertedWith("ERC20: transfer amount exceeds balance")
//     });
//
//     it("should have transferFrom functionality", async function () {
//         const [owner, account1, account2] = await ethers.getSigners()
//         await dollarpay.connect(account1).deposit({value: String(10 ** 16)}) // fee
//         await dollarpay.connect(account1).approve(account2.address, 30000)
//
//         await dollarpay.connect(account2).deposit({value: String(10 ** 16)}) // fee
//         expect(dollarpay.connect(account2).transferFrom(account1.address, owner.address, 30000)).to.be.revertedWith("ERC20: transfer amount exceeds balance")
//
//         await dollarpay.connect(account1).deposit({value: String(10 ** 18)})
//
//         expect(dollarpay.connect(account2).transferFrom(account1.address, owner.address, 30001)).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
//         await dollarpay.connect(account2).transferFrom(account1.address, owner.address, 20000)
//
//         expect(parseInt(await dollarpay.balanceOf(account1.address))).to.be.equal(40000)
//         expect(parseInt(await dollarpay.balanceOf(account2.address))).to.be.equal(0)
//         expect(parseInt(await dollarpay.balanceOf(owner.address))).to.be.equal(20000)
//
//         expect(parseInt(await dollarpay.balanceOf('0x0000000000000000000000000000000000000000'))).to.be.equal(1200)
//     });
//
//     it("functions that cost a fee should fail if not enough balance to pay the fee", async function () {
//         const [owner, account1, account2] = await ethers.getSigners()
//         expect(dollarpay.transfer(account1.address, 100)).to.be.revertedWith("Not enough balance to pay fee")
//         expect(dollarpay.approve(account1.address, 100)).to.be.revertedWith("Not enough balance to pay fee")
//         expect(dollarpay.transferFrom(account1.address, account2.address, 100)).to.be.revertedWith("Not enough balance to pay fee")
//     });
//
//     it("set the price in _update_price_and_refund_gas_cost", async function () {
//         const PriceFeed = await ethers.getContractFactory("RandomPriceFeedMock")
//         const priceFeed = await PriceFeed.deploy()
//         await priceFeed.deployed()
//
//         // 1 gas = 100 gwei
//         const GasPriceFeed = await ethers.getContractFactory("GasPriceFeedMock")
//         const gasPriceFeed = await GasPriceFeed.deploy()
//         await gasPriceFeed.deployed()
//
//         const Dollarpay = await ethers.getContractFactory("ExposedDollarpay")
//         dollarpay = await Dollarpay.deploy(priceFeed.address, gasPriceFeed.address, String(10 ** 16))
//         await dollarpay.deployed()
//
//         const [owner] = await ethers.getSigners()
//         await dollarpay.deposit({value: String(10 ** 18)})
//         const balance = parseInt(await dollarpay.balanceOf(owner.address))
//         dollarpay.update_price_and_refund_gas_cost(owner.address)
//         // balance should have changed due to priceMultiplier change.
//         expect(parseInt(await dollarpay.balanceOf(owner.address))).not.to.be.equal(balance)
//
//     });
//
//
//     it("should have correct price fetching and fee updating mechanism", async function () {
//         const PriceFeed = await ethers.getContractFactory("PriceFeedMock")
//         const priceFeed = await PriceFeed.deploy()
//         await priceFeed.deployed()
//
//         // 1 gas = 100 gwei
//         const GasPriceFeed = await ethers.getContractFactory("GasPriceFeedMock")
//         const gasPriceFeed = await GasPriceFeed.deploy()
//         await gasPriceFeed.deployed()
//
//         const Dollarpay = await ethers.getContractFactory("ExposedDollarpay")
//         dollarpay = await Dollarpay.deploy(priceFeed.address, gasPriceFeed.address, String(10 ** 16))
//         await dollarpay.deployed()
//
//         const [owner, account1, account2] = await ethers.getSigners()
//
//         const gasCost = 56680;
//         // expected cost = gasCost * 100 * 10**9 wei
//         // 10**18 wei = 600 cents
//         // 1 wei = 600/10**18 cents
//         // expected cost = gasCost * 100 * 10**9 * (600 / 10**18) cents
//         const expectedCost = gasCost * 100 * 10 ** 9 * (60000 / 10 ** 18);
//
//         // CASE 1: enough funds in refund account
//         await dollarpay.connect(account1).deposit({value: String(10 ** 18)})
//         await dollarpay.connect(account1).transfer('0x0000000000000000000000000000000000000000', 30000)
//         expect(parseInt(await dollarpay.balanceOf(account2.address))).to.be.equal(0)
//         // 300 plus 6 fee
//         expect(parseInt(await dollarpay.balanceOf('0x0000000000000000000000000000000000000000'))).to.be.equal(30600)
//         await dollarpay.update_price_and_refund_gas_cost(account2.address)
//
//         // balanceOf always rounds down. therefore we use floor and ceil here.
//         expect(parseInt(await dollarpay.balanceOf('0x0000000000000000000000000000000000000000'))).to.be.equal(30600 - Math.ceil(expectedCost))
//         expect(parseInt(await dollarpay.balanceOf(account2.address))).to.be.equal(Math.floor(expectedCost));
//         // fee reduced
//         expect(parseInt(await dollarpay.fee())).to.be.equal(9 * 10 ** 15);
//
//
//     });
//     it("should have correct price fetching and fee updating mechanism 2", async function () {
//         const PriceFeed = await ethers.getContractFactory("PriceFeedMock")
//         const priceFeed = await PriceFeed.deploy()
//         await priceFeed.deployed()
//
//         // 1 gas = 100 gwei
//         const GasPriceFeed = await ethers.getContractFactory("GasPriceFeedMock")
//         const gasPriceFeed = await GasPriceFeed.deploy()
//         await gasPriceFeed.deployed()
//
//         const Dollarpay = await ethers.getContractFactory("ExposedDollarpay")
//         dollarpay = await Dollarpay.deploy(priceFeed.address, gasPriceFeed.address, String(10 ** 14))
// `        await dollarpay.deployed()
// `
//         const [owner, account1, account2] = await ethers.getSigners()
//
//         const gasCost = 56680;
//         // expected cost = gasCost * 100 * 10**9 wei
//         // 10**18 wei = 600 cents
//         // 1 wei = 600/10**18 cents
//         // expected cost = gasCost * 100 * 10**9 * (600 / 10**18) cents
//         const expectedCost = gasCost * 100 * 10 ** 9 * (60000 / 10 ** 18);
//
//         // CASE 2: not enough funds in refund account
//         await dollarpay.connect(account1).deposit({value: String(10 ** 18)})
//         await dollarpay.connect(account1).transfer('0x0000000000000000000000000000000000000000', 30)
//         expect(parseInt(await dollarpay.balanceOf(account2.address))).to.be.equal(0)
//         // 300 plus 6 fee
//         expect(parseInt(await dollarpay.balanceOf('0x0000000000000000000000000000000000000000'))).to.be.equal(36)
//         await dollarpay.update_price_and_refund_gas_cost(account2.address)
//
//         // balanceOf always rounds down. therefore we use floor and ceil here.
//         expect(parseInt(await dollarpay.balanceOf('0x0000000000000000000000000000000000000000'))).to.be.equal(0)
//         expect(parseInt(await dollarpay.balanceOf(account2.address))).to.be.equal(36);
//         // fee reduced
//         expect(parseInt(await dollarpay.fee())).to.be.equal(12 * 10 ** 13);
//     });

