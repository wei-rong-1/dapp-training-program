import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { Button, Col, Row, Tooltip, message, Modal, Form, Input, InputNumber, Radio } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { getCommitment, generateProof, merkleTree, getNullifierHash } from "../helpers/ZkUtils";

export default function LotteryClaim({ visible, setVisible, lotteryContract, userSigner, onSuccess, ...props }) {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const getCommitEvents = async () => {
    const events = await lotteryContract.queryFilter("Commit");
    return events.map(e => {
      return e.args.commitment;
    });
  };

  const handleFinish = async values => {
    let { nullifier, secret, recipient, bias } = values;
    setSubmitLoading(true);

    nullifier = ethers.utils.hexZeroPad(ethers.BigNumber.from(nullifier).toHexString(), 31);
    secret = ethers.utils.hexZeroPad(ethers.BigNumber.from(secret).toHexString(), 4);
    // console.log("nullifier: ", nullifier);
    // console.log("secret: ", secret);

    const commitment = await getCommitment(nullifier, secret);
    const nullifierHash = await getNullifierHash(nullifier);
    const commitments = await getCommitEvents();
    // console.log("getCommitEvents: ", commitments);
    const index = commitments.indexOf(commitment);
    const winningNumber = ethers.BigNumber.from(await lotteryContract.winningNumber());
    const myNumber = ethers.BigNumber.from(secret);
    let difference = winningNumber.gt(myNumber) ? winningNumber.sub(myNumber) : myNumber.sub(winningNumber);
    difference = difference.add(ethers.BigNumber.from(bias));
    // const tree = await merkleTree(commitments);
    const tree = await merkleTree(commitments.map(i => ethers.BigNumber.from(i).toString()));

    const { pathElements, pathIndices } = tree.path(index);
    const proofData = await generateProof({
      root: tree.root,
      winningNumber: ethers.utils.hexZeroPad(winningNumber.toHexString(), 32),
      difference: ethers.utils.hexZeroPad(difference.toHexString(), 32),
      nullifierHash,
      recipient: ethers.utils.hexZeroPad(recipient, 32),
      nullifier: ethers.utils.hexZeroPad(nullifier, 32),
      secret: ethers.utils.hexZeroPad(secret, 32),
      pathElements,
      pathIndices,
    });

    try {
      const tx = await lotteryContract.claim(
        ethers.BigNumber.from(tree.root).toHexString(),
        difference,
        nullifierHash,
        recipient,
        proofData,
      );

      const receipt = await tx.wait();
      if (receipt.blockNumber > 0) {
        message.success("Claim successfully");
        onSuccess()
      } else {
        message.error("Failed to claim");
      }
    } catch {
      message.error("Failed to claim");
    } finally {
      setVisible(false);
      setSubmitLoading(false);
    }
  };

  const handleFinishFailed = (...args) => {
    console.log("handleFinishFailed: ", args);
  };

  const handleCancel = () => {
    console.log("Clicked cancel button");
    setVisible(false);
  };

  return (
    <div>
      <Modal title="Claim" visible={visible} onCancel={handleCancel} footer={null}>
        <Form
          form={form}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="Nullifier"
            name="nullifier"
            rules={[{ required: true, message: "Please input the Nullifier" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Secret Number"
            name="secret"
            rules={[{ required: true, message: "Please input the Secret Number" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Different Bias"
            name="bias"
            rules={[{ required: true, message: "Please input the Difference Bias" }]}
          >
            <InputNumber stringMode default="0" min="0" max="100000" step="1" />
          </Form.Item>
          <Form.Item
            label="Recipient Address"
            name="recipient"
            rules={[{ required: true, message: "Please input the Recipient Address" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" htmlType="submit" disabled={submitLoading}>
              Reveal
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
