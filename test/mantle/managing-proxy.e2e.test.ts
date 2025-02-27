import { assert } from "chai";
import { TransactionResponse } from "@ethersproject/providers";

import {
  ERC20BridgedPermit__factory,
  GovBridgeExecutor__factory,
  OssifiableProxy__factory,
  L2ERC20TokenBridge__factory,
} from "../../typechain";
import { E2E_TEST_CONTRACTS_MANTLE as E2E_TEST_CONTRACTS } from "../../utils/testing/e2e";
import env from "../../utils/env";
import { wei } from "../../utils/wei";
import network from "../../utils/network";
import { scenario } from "../../utils/testing";
import lido from "../../utils/lido";
import mantle from "../../utils/mantle";

let ossifyMessageResponse: TransactionResponse;
let upgradeMessageResponse: TransactionResponse;

scenario(
  "Mantle :: AAVE governance crosschain bridge: proxy management",
  ctxFactory
)
  .step("Check OssifiableProxy deployed correct", async (ctx) => {
    const { proxyToOssify } = ctx;
    const admin = await proxyToOssify.proxy__getAdmin();

    assert.equal(admin, E2E_TEST_CONTRACTS.l2.govBridgeExecutor);
  })

  .step("Proxy upgrade: send crosschain message", async (ctx) => {
    const implBefore = await await ctx.proxyToOssify.proxy__getImplementation();

    assert.equal(implBefore, ctx.l2ERC20TokenBridge.address);
    const executorCalldata =
      await ctx.govBridgeExecutor.interface.encodeFunctionData("queue", [
        [ctx.proxyToOssify.address],
        [0],
        ["proxy__upgradeTo(address)"],
        [
          "0x" +
            ctx.proxyToOssify.interface
              .encodeFunctionData("proxy__upgradeTo", [ctx.l2Token.address])
              .substring(10),
        ],
        [false],
      ]);

    const mntAddresses = mantle.addresses("goerli");

    const { calldata, callvalue } = await ctx.messaging.prepareL2Message({
      sender: ctx.lidoAragonDAO.agent.address,
      recipient: ctx.govBridgeExecutor.address,
      calldata: executorCalldata,
    });

    const tx = await ctx.lidoAragonDAO.createVote(
      ctx.l1LDOHolder,
      "E2E Test Voting",
      {
        address: ctx.lidoAragonDAO.agent.address,
        signature: "execute(address,uint256,bytes)",
        decodedCallData: [
          mntAddresses.L1CrossDomainMessenger,
          callvalue,
          calldata,
        ],
      }
    );

    await tx.wait();
  })

  .step(
    "Proxy upgrade: Enacting Voting",
    async ({ lidoAragonDAO, l1LDOHolder }) => {
      const votesLength = await lidoAragonDAO.voting.votesLength();

      upgradeMessageResponse = await lidoAragonDAO.voteAndExecute(
        l1LDOHolder,
        votesLength.toNumber() - 1
      );

      await upgradeMessageResponse.wait();
    }
  )

  .step("Proxy upgrade: wait for relay", async ({ messaging }) => {
    await messaging.waitForL2Message(upgradeMessageResponse.hash);
  })

  .step(
    "Proxy upgrade: execute",
    async ({ proxyToOssify, govBridgeExecutor, l2Token }) => {
      const taskId =
        (await govBridgeExecutor.getActionsSetCount()).toNumber() - 1;

      const executeTx = await govBridgeExecutor.execute(taskId);
      await executeTx.wait();
      const implAfter = await await proxyToOssify.proxy__getImplementation();

      assert(implAfter, l2Token.address);
    }
  )

  .step("Proxy ossify: send crosschain message", async (ctx) => {
    const isOssifiedBefore = await ctx.proxyToOssify.proxy__getIsOssified();

    assert.isFalse(isOssifiedBefore);

    const executorCalldata =
      await ctx.govBridgeExecutor.interface.encodeFunctionData("queue", [
        [ctx.proxyToOssify.address],
        [0],
        ["proxy__ossify()"],
        ["0x00"],
        [false],
      ]);

    const mntAddresses = mantle.addresses("goerli");

    const { calldata, callvalue } = await ctx.messaging.prepareL2Message({
      sender: ctx.lidoAragonDAO.agent.address,
      recipient: ctx.govBridgeExecutor.address,
      calldata: executorCalldata,
    });

    const tx = await ctx.lidoAragonDAO.createVote(
      ctx.l1LDOHolder,
      "E2E Test Voting",
      {
        address: ctx.lidoAragonDAO.agent.address,
        signature: "execute(address,uint256,bytes)",
        decodedCallData: [
          mntAddresses.L1CrossDomainMessenger,
          callvalue,
          calldata,
        ],
      }
    );

    await tx.wait();
  })

  .step(
    "Proxy ossify: Enacting Voting",
    async ({ lidoAragonDAO, l1LDOHolder }) => {
      const votesLength = await lidoAragonDAO.voting.votesLength();

      ossifyMessageResponse = await lidoAragonDAO.voteAndExecute(
        l1LDOHolder,
        votesLength.toNumber() - 1
      );

      await ossifyMessageResponse.wait();
    }
  )

  .step("Proxy ossify: wait for relay", async ({ messaging }) => {
    await messaging.waitForL2Message(ossifyMessageResponse.hash);
  })

  .step(
    "Proxy ossify: execute",
    async ({ govBridgeExecutor, proxyToOssify }) => {
      const taskId =
        (await govBridgeExecutor.getActionsSetCount()).toNumber() - 1;
      const executeTx = await govBridgeExecutor.execute(taskId, {
        gasLimit: 2000000,
      });
      await executeTx.wait();

      const isOssifiedAfter = await proxyToOssify.proxy__getIsOssified();

      assert.isTrue(isOssifiedAfter);
    }
  )

  .run();

async function ctxFactory() {
  const ethMntNetwork = network.multichain(["eth", "mnt"], "goerli");

  const [l1Provider] = ethMntNetwork.getProviders({ forking: false });
  const [l1Tester, l2Tester] = ethMntNetwork.getSigners(
    env.string("TESTING_PRIVATE_KEY"),
    { forking: false }
  );

  const [l1LDOHolder] = ethMntNetwork.getSigners(
    env.string("TESTING_MNT_LDO_HOLDER_PRIVATE_KEY"),
    { forking: false }
  );

  return {
    lidoAragonDAO: lido("goerli", l1Provider),
    messaging: mantle.messaging("goerli", { forking: false }),
    gasAmount: wei`0.1 ether`,
    l1Tester,
    l2Tester,
    l1LDOHolder,
    l2Token: ERC20BridgedPermit__factory.connect(
      E2E_TEST_CONTRACTS.l2.l2Token,
      l2Tester
    ),
    l2ERC20TokenBridge: L2ERC20TokenBridge__factory.connect(
      E2E_TEST_CONTRACTS.l2.l2ERC20TokenBridge,
      l2Tester
    ),
    govBridgeExecutor: GovBridgeExecutor__factory.connect(
      E2E_TEST_CONTRACTS.l2.govBridgeExecutor,
      l2Tester
    ),
    proxyToOssify: await new OssifiableProxy__factory(l2Tester).deploy(
      E2E_TEST_CONTRACTS.l2.l2ERC20TokenBridge,
      E2E_TEST_CONTRACTS.l2.govBridgeExecutor,
      "0x"
    ),
  };
}
