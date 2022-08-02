import { ethers } from "ethers";
import React, { useEffect, useState, useCallback } from "react";
import { Button, Col, Row, message, Modal, Form, Input, InputNumber, Radio } from "antd";

import * as lotteryArtifact from "../contracts/CROLottery.json";
import LotteryItem from "./LotteryItem";

export default function LotteryList({
  userSigner,
  localProvider,
  factoryContract,
  currentBlock,
  lotteryCount,
  ...props
}) {
  const [lotteryMap, setLotteryMap] = useState();

  const fetchLotteryMap = async () => {
    const r = [];

    for (let i = 0; i < lotteryCount; i++) {
      r.push(fetchLottery(i));
    }

    Promise.all(r).then(lotteries => {
      const map = lotteries.reduce((h, v) => {
        h[v.id] = v;
        return h;
      }, {});

      setLotteryMap(map);
    });
  }

  const fetchLottery = async id => {
    if (!factoryContract) return;
    let address = await factoryContract.lottery(id);
    let providerOrSigner = userSigner ? userSigner : localProvider;
    if (!providerOrSigner) return;

    let contract = new ethers.Contract(address, lotteryArtifact.abi, providerOrSigner);

    return {
      id,
      address,
      contract,
      status: await contract.status(),
      denomination: await contract.denomination(),
      currentBonus: await contract.currentBonus(),
      winningNumber: await contract.winningNumber(),
      minimumDifference: await contract.minimumDifference(),
      winnerCount: await contract.winnerCount(),
      playerCount: await contract.playerCount(),
      creatingBlock: await contract.creatingBlock(),
      startingBlock: await contract.startingBlock(),
      waitingBlocks: await contract.waitingBlocks(),
      lockingBlocks: await contract.lockingBlocks(),
      // nonceHash: await contract.nonceHash(),
      // levels: await contract.levels(),
      // verifier: await contract.verifier(),
      // hasher: await contract.hasher(),
      // witnet: await contract.witnet(),
      // token: await contract.token(),
    };
  };

  const handleLotteryChanged = async (id) => {
    const lottery = await fetchLottery(id);
    
    setLotteryMap({
      ...lotteryMap,
      [id]: lottery,
    });
  };

  useEffect(() => {
    fetchLotteryMap();
  }, [userSigner, localProvider, factoryContract, lotteryCount]);

  return (
    <div className="lottery-list">
      <div style={{ marginBottom: "15px" }}>
        Lottery Count: {lotteryCount.toString()}
      </div>
      {lotteryMap &&
        Object.values(lotteryMap)
          .sort((a, b) => parseInt(b.id) - parseInt(a.id))
          .map(lottery => (
            <LotteryItem
              key={lottery.id}
              lottery={lottery}
              currentBlock={currentBlock}
              userSigner={userSigner}
              onChange={handleLotteryChanged}
            />
          ))}
    </div>
  );
}
