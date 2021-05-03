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
        } catch (error) {
            expect(error.message).to.be.equal("VM Exception while processing transaction: revert ERC20: burn amount exceeds balance")
        }

        // transfer 6 VRT
        await virtuals.transfer(addr1.address, String(6 * 10 ** 18))

        // not enough balance to pay the fee
        try {
            await virtuals.connect(addr1).buy("BTC", String(5 * 10 ** 17))
        } catch (error) {
            expect(error.message).to.be.equal("VM Exception while processing transaction: revert not enough balance to pay fee")
        }

        // transfer 0.018 VRT
        await virtuals.transfer(addr1.address, String(18 * 10 ** 15))

        await virtuals.connect(addr1).buy("BTC", String(5 * 10 ** 17))

        expect(await virtuals.balanceOf(addr1.address)).to.be.equal(0);
        expect(await virtuals.positionOf(addr1.address, "BTC")).to.be.equal(String(5 * 10 ** 17));
    });

    it("have sell functionality", async function () {
        const [owner, addr1] = await ethers.getSigners()
        await virtuals.addOrUpdatePriceFeed("BTC", priceFeed600.address)
        await virtuals.addOrUpdatePriceFeed("VRT", priceFeedVRT.address)


        // transfer 6 VRT
        await virtuals.transfer(addr1.address, String(6 * 10 ** 18))
        // transfer 0.018 VRT for fee
        await virtuals.transfer(addr1.address, String(18 * 10 ** 15))
        // buy 0.5 BTC
        await virtuals.connect(addr1).buy("BTC", String(5 * 10 ** 17))

        // price of BTC drops to 400
        await virtuals.addOrUpdatePriceFeed("BTC", priceFeed400.address)

        // not funds to sell
        try {
            await virtuals.connect(addr1).sell("BTC", String(6 * 10 ** 17))
        } catch (error) {
            expect(error.message).to.be.equal("VM Exception while processing transaction: revert not enough assets to sell")
        }

        // not enough balance to pay the fee
        try {
            await virtuals.connect(addr1).sell("BTC", String(5 * 10 ** 17))
        } catch (error) {
            expect(error.message).to.be.equal("VM Exception while processing transaction: revert not enough balance to pay fee")
        }

        // the price for 0.5 BTC is 200 USD == 4 VRT
        // fee 0.3% of 4 = 0.012
        // transfer 0.018 VRT for fee
        await virtuals.transfer(addr1.address, String(12 * 10 ** 15))

        await virtuals.connect(addr1).sell("BTC", String(5 * 10 ** 17))

        expect(await virtuals.balanceOf(addr1.address)).to.be.equal(String(4 * 10 ** 18))
        expect(await virtuals.positionOf(addr1.address, "BTC")).to.be.equal(String(0))
    });


});

