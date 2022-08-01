import { ethers } from "ethers";
import { Button, Col, Row } from "antd";
import React, { useEffect, useState, useMemo, useCallback } from "react";

import * as factoryArtifact from "../contracts/CROLotteryFactory.json";

import LotteryNew from "./LotteryNew";
import LotteryList from "./LotteryList";

function LotteryIndex({ userSigner, localProvider, targetNetwork }) {
  const [factoryContract, setFactoryContract] = useState();
  const [currentBlock, setCurrentBlock] = useState();
  const [factoryOwner, setFactoryOwner] = useState();
  const [signerAddress, setSignerAddress] = useState();

  const [newLotteryVisible, setNewLotteryVisible] = useState(false);


  const factoryDeployments = {
    'localhost': '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    // 'localhost': '0xf1B87E513386d39543C36434F5b9636e83c67416', // only for forked mainnet
    'mainnet': '0xf1B87E513386d39543C36434F5b9636e83c67416'
  }

  useEffect(async () => {
    let providerOrSigner = userSigner ? userSigner : localProvider;
    if (providerOrSigner) {
      // Set contracts
      setFactoryContract(new ethers.Contract(factoryDeployments[targetNetwork.name], factoryArtifact.abi, providerOrSigner))

      fetchFactoryOwner();
      fetchCurrentBlock();
      fetchSignerAddress();
    }
  }, [userSigner, localProvider, targetNetwork])

  const fetchFactoryOwner = useCallback(async () => {
    if (factoryContract) {
      const factoryOwner = await factoryContract.owner();
      setFactoryOwner(factoryOwner)
    }
  }, [factoryContract])

  const fetchCurrentBlock = useCallback(async () => {
    if (localProvider) {
      const currentBlock = await localProvider.getBlockNumber();
      setCurrentBlock(currentBlock)
    }
  }, [localProvider])

  const fetchSignerAddress = useCallback(async () => {
    if (userSigner) {
      setSignerAddress(await userSigner.getAddress())
    } else {
      setSignerAddress(null)
    }
  }, [userSigner])

  const isFactoryOwner = useMemo(() => {
    return !!signerAddress && signerAddress === factoryOwner
  }, [signerAddress, factoryOwner]);

  return (
    <div className="lottery-index">
      {
        isFactoryOwner &&
        <div className="lottery-admin">
          <Row>
            <Col span={24}>
              <LotteryNew
                factoryContract={factoryContract}
                visible={newLotteryVisible}
                setVisible={setNewLotteryVisible}
              />
            </Col>
          </Row>
        </div>
      }

      <LotteryList
        userSigner={userSigner}
        localProvider={localProvider}
        factoryContract={factoryContract}
        currentBlock={currentBlock}
      />

    </div>
  );
}

export default LotteryIndex;
