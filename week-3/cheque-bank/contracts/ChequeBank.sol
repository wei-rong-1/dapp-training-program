// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

abstract contract ChequeBank {

    struct ChequeInfo {
        uint amount;
        bytes32 chequeId;
        uint32 validFrom;
        uint32 validThru;
        address payee;
        address payer;
    }

    struct SignOverInfo {
        uint8 counter;
        bytes32 chequeId;
        address oldPayee;
        address newPayee;
    }

    struct Cheque {
        ChequeInfo chequeInfo;
        bytes sig;
    }
    struct SignOver {
        SignOverInfo signOverInfo;
        bytes sig;
    }

    function deposit() payable external virtual;

    function withdraw(uint amount) external virtual;

    function withdrawTo(uint amount, address payable recipient) external virtual;

    function redeem(Cheque memory chequeData) external virtual;

    function revoke(bytes32 chequeId) external virtual;

    function notifySignOver(
        Cheque memory chequeData, // here need cheque data to prevent some edge cases
        SignOver memory signOverData
    ) external virtual;

    function redeemSignOver(
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) external virtual;

    function isChequeValid(
        address payee,
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) view public virtual returns (bool);
}