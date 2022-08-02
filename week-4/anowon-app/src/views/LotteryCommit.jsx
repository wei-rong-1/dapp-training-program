import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { Button, Col, Row, Tooltip, message, Modal, Form, Input, InputNumber, Radio } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { getCommitment } from "../helpers/ZkUtils";

export default function LotteryCommit({ visible, setVisible, lotteryContract, onSuccess, ...props }) {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const handleFinish = async values => {
    const { nullifier, secret } = values;
    setSubmitLoading(true);
    try {
      const commitment = await getCommitment(nullifier, secret);
      const denomination = await lotteryContract.denomination();
      const tx = await lotteryContract.commit(commitment, { value: denomination });
      const receipt = await tx.wait();
      if (receipt.blockNumber > 0) {
        message.success("Commit successfully");
        onSuccess()
      } else {
        message.error("Failed to commit");
      }
    } catch {
      message.error("Failed to commit");
    } finally {
      setVisible(false);
      setSubmitLoading(false);
    }
  };

  const randomNullifier = () => {
    const value = ethers.BigNumber.from(ethers.utils.randomBytes(31)).toHexString();
    form.setFieldsValue({
      nullifier: value,
      secret: form.getFieldValue("secret"),
    })
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
      <Modal title="Commit" visible={visible} onCancel={handleCancel} footer={null}>
        <Form
          form={form}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
          autoComplete="off"
        >
          <Form.Item label="Nullifier" tooltip="31 bytes random text">
            <Input.Group>
              <Form.Item
                name="nullifier"
                rules={[{ required: true, message: "Please input commitment nullifier" }]}
                noStyle
              >
                <Input style={{ width: "calc(100% - 50px)" }} />
              </Form.Item>
              <Tooltip title="regenerate nullifier">
                <Button icon={<ReloadOutlined />} onClick={() => randomNullifier()} />
              </Tooltip>
            </Input.Group>
          </Form.Item>

          <Form.Item
            label="Secret Number"
            tooltip="A number range from 0 to 2 to the power of 32. (0, 2**32)"
            name="secret"
            rules={[{ required: true, message: "Please input commitment secret number" }]}
          >
            <InputNumber style={{ width: "calc(100% - 50px)" }} stringMode min="0" max="4294967296" step="1000" />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" htmlType="submit" disabled={submitLoading}>
              Commit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
