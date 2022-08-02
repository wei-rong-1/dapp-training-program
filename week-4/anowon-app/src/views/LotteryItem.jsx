import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { Button, Col, Row, Divider, Statistic, message, Modal, Form, Input, InputNumber, Radio } from "antd";
import LotteryCommit from "./LotteryCommit";
import LotteryReveal from "./LotteryReveal";
import LotteryClaim from "./LotteryClaim";

export default function LotteryItem({ lottery, currentBlock, userSigner, onChange, ...props }) {
  const [lotteryContract, setLotteryContract] = useState();
  const [actionLoading, setActionLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState();
  const [commitLotteryVisible, setCommitLotteryVisible] = useState(false);
  const [revealLotteryVisible, setRevealLotteryVisible] = useState(false);
  const [claimLotteryVisible, setClaimLotteryVisible] = useState(false);

  const statusEnum = ['Pending', 'Preparing', 'Revealing', 'Done']

  useEffect(() => {
    if (commitLotteryVisible) {
      setActionLoading(true);
      setCurrentAction('commit');
    } else {
      setActionLoading(false);
      setCurrentAction(null);
    }
  }, [commitLotteryVisible])

  const handleCommit = async () => {
    setCommitLotteryVisible(true);
  }

  const handleClaim = async () => {
    setClaimLotteryVisible(true)
  }

  const handlePrepare = async () => {
    setActionLoading(true);
    setCurrentAction('prepare');

    try {
      // 10 CRO for randomize
      const tx = await lotteryContract.prepare({ value: ethers.utils.parseEther('10') })
      const receipt = await tx.wait()
      if (receipt.blockNumber) {
        message.success("Prepare successfully")
      } else {
        message.error("Failed to prepare")
      }
      onChange(lottery.id)
    } catch {
      message.error("Failed to prepare")
    } finally {
      setActionLoading(false)
      setCurrentAction(null);
    }
  }

  const handleReveal = async () => {
    setRevealLotteryVisible(true);
  }

  const handleFinalize = async () => {
    setActionLoading(true);
    setCurrentAction('finalize');

    try {
      const tx = await lotteryContract.finalize()
      const receipt = await tx.wait()
      if (receipt.blockNumber) {
        message.success("Finalize successfully")
      } else {
        message.error("Failed to finalize")
      }
      onChange(lottery.id)
    } catch {
      message.error("Failed to finalize")
    } finally {
      setActionLoading(false)
      setCurrentAction(null);
    }
  }

  useEffect(() => {
    // console.log(lottery);
    setLotteryContract(lottery.contract);
  }, [lottery])


  return (
    <div className="lottery-card">
      <Row className="lottery-hd" justify="space-between" align="middle">
        <Col flex={1}>
          <span className="lottery-id">#{lottery.id}</span>
          <span className="lottery-status">Status: {statusEnum[lottery.status]}</span>
          <span className="lottery-denomination">Denomination: {lottery.denomination ? ethers.utils.formatEther(lottery.denomination).toString() : '0'} CRO</span>
        </Col>
        <Col>
        {
          lottery.status === 0 &&          
          <Button type="primary" loading={currentAction === "commit" && actionLoading} disabled={actionLoading} shape="round" onClick={handleCommit}>
            Commit
          </Button>
        }
        {
          lottery.status === 2 &&
          <Button type="primary" loading={currentAction === "claim" && actionLoading} disabled={actionLoading} shape="round" onClick={handleClaim}>
            Claim
          </Button>
        }
        <Divider type="vertical" />
        {
          lottery.status === 0 &&
          <Button type="primary" loading={currentAction === "prepare" && actionLoading} disabled={actionLoading} shape="round" onClick={handlePrepare}>
            Prepare
          </Button>
        }
        {
          lottery.status === 1 &&
          <Button type="primary" loading={currentAction === "reveal" && actionLoading} disabled={actionLoading} shape="round" onClick={handleReveal}>
            Reveal
          </Button>
        }
        {
          lottery.status === 2 &&
          <Button type="primary" loading={currentAction === "finalize" && actionLoading} disabled={actionLoading} shape="round" onClick={handleFinalize}>
            Finalize
          </Button>
        }

        <LotteryCommit 
          visible={commitLotteryVisible}
          setVisible={setCommitLotteryVisible}
          lotteryContract={lotteryContract}
          onSuccess={() => onChange(lottery.id)}
        />

        <LotteryReveal 
          visible={revealLotteryVisible}
          setVisible={setRevealLotteryVisible}
          lotteryContract={lotteryContract}
          onSuccess={() => onChange(lottery.id)}
        />

        <LotteryClaim
          visible={claimLotteryVisible}
          setVisible={setClaimLotteryVisible}
          lotteryContract={lotteryContract}
          userSigner={userSigner}
          onSuccess={() => onChange(lottery.id)}
        />

        </Col>
      </Row>
      <Row className="lottery-bd">
        <Col className="lottery-block-info" span={8}>
          <div>
            <span>Current Block: </span>
            <span>#{currentBlock?.toString()} </span>
          </div>
          <div>
            <span>Created Block: </span>
            {
              lottery.creatingBlock && lottery.creatingBlock > 0 ?
              <span>#{lottery.creatingBlock.toString()} </span> :
              <span> - </span>
            }
          </div>
          <div>
            <span>Pending Until: </span>
            {
              lottery.creatingBlock && lottery.creatingBlock > 0 ?
              <span>#{lottery.creatingBlock.add(lottery.waitingBlocks).toString()} </span> :
              <span> - </span>
            }
          </div>
          <div>
            <span>Started Block: </span>
            {
              lottery.startingBlock && lottery.startingBlock > 0 ?
              <span>#{lottery.startingBlock.toString()} </span> :
              <span> - </span>
            }
          </div>
          <div>
            <span>Locking Until: </span>
            {
              lottery.startingBlock && lottery.startingBlock > 0 ?
              <span>#{lottery.startingBlock.add(lottery.lockingBlocks).toString()} </span> :
              <span> - </span>
            }
          </div>
        </Col>
        <Col className="lottery-stat-info" span={16}>
          <Row gutter={15}>
            <Col span={8}>
              <Statistic title="Supply Total" value={lottery.playerCount > 0 ? ethers.utils.formatEther(lottery.denomination.mul(lottery.playerCount)) : 0} />
            </Col>
            <Col span={8}>
              <Statistic title="Player Count" value={lottery.playerCount?.toString()} />
            </Col>
            <Col span={8}>
              <Statistic title="Current Bonus" value={lottery.currentBonus ? ethers.utils.formatEther(lottery.currentBonus).toString() : '-'} />
            </Col>
          </Row>
          <Row gutter={15} style={{ marginTop: "20px" }}>
            <Col span={8}>
              <Statistic title="Minimum Difference" value={lottery.winnerCount > 0 ? lottery.minimumDifference?.toString() : 'MAX'} />
            </Col>
            <Col span={8}>
              <Statistic title="Winner Count" value={lottery.winnerCount?.toString()} />
            </Col>
            <Col span={8}>
              <Statistic title="Winning Number" value={lottery.winningNumber?.toString()} />
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}
