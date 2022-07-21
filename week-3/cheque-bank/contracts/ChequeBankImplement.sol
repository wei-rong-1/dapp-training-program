// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ChequeBank.sol";

contract ChequeBankImplement is ChequeBank {
    uint256 constant SIGN_OVER_MAGIC = 0xFFFFDEAD;

    mapping(address => uint256) private balances;
    mapping(bytes32 => bool) private redemptions;
    mapping(bytes32 => mapping(address => bool)) private revocations;
    mapping(bytes32 => mapping(uint8 => mapping(address => address))) private signedOvers;

    event Redeemed(
        bytes32 indexed chequeId,
        address indexed payer,
        address indexed payee,
        uint256 amount
    );

    event Revoked(bytes32 indexed chequeId, address indexed requester);

    event SignedOver(
        bytes32 indexed chequeId,
        uint256 counter,
        address oldPayee,
        address newPayee
    );

    function balanceOf(address payer) public view returns (uint256) {
        return balances[payer];
    }

    function revocationOf(bytes32 chequeId, address revoker)
        public
        view
        returns (bool)
    {
        return revocations[chequeId][revoker];
    }

    function signedOverOf(
        bytes32 chequeId,
        uint8 counter,
        address oldPayee
    ) public view returns (address) {
        return signedOvers[chequeId][counter][oldPayee];
    }

    function deposit() external payable override {
        require(msg.value > 0, "ChequeBankImplement: invalid deposit");

        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external override {
        _withdraw(amount, payable(msg.sender));
    }

    function withdrawTo(uint256 amount, address payable recipient)
        external
        override
    {
        _withdraw(amount, recipient);
    }

    function redeem(Cheque memory chequeData) external override {
        _redeem(chequeData, new SignOver[](0));
    }

    function redeemSignOver(
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) public override {
        _redeem(chequeData, signOverData);
    }

    function revoke(bytes32 chequeId) external override {
        require(
            redemptions[chequeId] == false,
            "ChequeBankImplement: can not revoke redeemed cheque"
        );
        require(
            revocations[chequeId][msg.sender] == false,
            "ChequeBankImplement: already revoked"
        );

        // any user can send transaction to request to revoke a cheque.
        // but only a revocation from payer or signed over payees will work when redeem.
        revocations[chequeId][msg.sender] = true;
        emit Revoked(chequeId, msg.sender);
    }

    function notifySignOver(
        Cheque memory chequeData, /* here need cheque data to prevent some edge cases */
        SignOver memory signOverData
    ) external override {
        ChequeInfo memory chequeInfo = chequeData.chequeInfo;
        SignOverInfo memory signOverInfo = signOverData.signOverInfo;
        bytes32 chequeId = signOverInfo.chequeId;
        uint8 counter = signOverInfo.counter;
        address oldPayee = signOverInfo.oldPayee;
        address newPayee = signOverInfo.newPayee;

        require(
            redemptions[chequeId] == false,
            "ChequeBankImplement: already redeemed"
        );
        require(
            chequeInfo.chequeId == chequeId,
            "ChequeBankImplement: mismatched cheque"
        );
        require(
            signOverInfo.newPayee != address(0),
            "ChequeBankImplement: invalid new payee"
        );
        require(
            counter > 0 && counter <= 6,
            "ChequeBankImplement: invalid signOver counter"
        );

        // signature check
        require(
            _checkChequeInfo(chequeInfo, chequeData.sig),
            "ChequeBankImplement: invalid cheque, bad signature"
        );
        require(
            _checkSignOverInfo(signOverInfo, signOverData.sig),
            "ChequeBankImplement: invalid signOver, bad signature"
        );

        // payer may revoke before the first sign over notification
        require(
            counter != 1 || revocations[chequeId][chequeInfo.payer] == false,
            "ChequeBankImplement: payer revoke before payee sign over"
        );
        // require not be revoked by old payee
        require(
            revocations[chequeId][oldPayee] == false,
            "ChequeBankImplement: been revoked before signOver"
        );
        // at the same counter, should not signed over more than one time
        require(
            signedOvers[chequeId][counter][oldPayee] == address(0),
            "ChequeBankImplement: been signed over"
        );

        signedOvers[chequeId][counter][oldPayee] = newPayee;
        emit SignedOver(chequeId, counter, oldPayee, newPayee);
    }

    function isChequeValid(
        address payee,
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) public view override returns (bool) {
        ChequeInfo memory chequeInfo = chequeData.chequeInfo;

        // basic check
        if (
            payee == address(0) ||
            redemptions[chequeInfo.chequeId] != false ||
            chequeInfo.validFrom > block.number ||
            (chequeInfo.validThru != 0 &&
                chequeInfo.validThru <= block.number) ||
            chequeInfo.amount > balances[chequeInfo.payer]
        ) {
            return false;
        }

        address finalPayee = _getPayee(chequeData, signOverData);
        if (finalPayee != payee) {
            return false;
        }

        if (
            signedOvers[chequeInfo.chequeId][1][chequeInfo.payee] == address(0)
        ) {
            // when never signed over, but payer have revoked the cheque
            if (revocations[chequeInfo.chequeId][chequeInfo.payer] == true) {
                return false;
            }
        } else {
            // or the (signed over) payee have revoked the cheque
            if (revocations[chequeInfo.chequeId][payee] == true) {
                return false;
            }
        }

        return true;
    }

    function _redeem(Cheque memory chequeData, SignOver[] memory signOverData)
        internal
    {
        ChequeInfo memory chequeInfo = chequeData.chequeInfo;

        // basic check
        require(
            redemptions[chequeInfo.chequeId] == false,
            "ChequeBankImplement: already redeemed"
        );
        require(
            chequeInfo.amount <= balances[chequeInfo.payer],
            "ChequeBankImplement: not enough fund"
        );
        require(
            chequeInfo.validFrom <= block.number,
            "ChequeBankImplement: invalid cheque"
        );
        require(
            chequeInfo.validThru == 0 || chequeInfo.validThru > block.number,
            "ChequeBankImplement: invalid cheque"
        );

        address payee = _getPayee(chequeData, signOverData);
        require(payee != address(0), "invalid payee");

        if (
            signedOvers[chequeInfo.chequeId][1][chequeInfo.payee] == address(0)
        ) {
            // when never signed over, payer should have not revoked the cheque
            require(
                revocations[chequeInfo.chequeId][chequeInfo.payer] == false,
                "ChequeBankImplement: been revoked by payer"
            );
        } else {
            // otherwise, the (signed over) payee should have not revoked the cheque
            require(
                revocations[chequeInfo.chequeId][payee] == false,
                "ChequeBankImplement: been revoked by payee"
            );
        }

        balances[chequeInfo.payer] -= chequeInfo.amount;
        redemptions[chequeInfo.chequeId] = true;

        emit Redeemed(
            chequeInfo.chequeId,
            chequeInfo.payer,
            payee,
            chequeInfo.amount
        );

        payable(payee).transfer(chequeInfo.amount);
    }

    function _getPayee(Cheque memory chequeData, SignOver[] memory signOverData)
        internal
        view
        returns (address lastPayee)
    {
        ChequeInfo memory chequeInfo = chequeData.chequeInfo;

        if (!_checkChequeInfo(chequeInfo, chequeData.sig)) {
            return address(0);
        }

        bool[] memory _signs = new bool[](6);
        address[] memory _payees = new address[](7);
        _payees[0] = chequeInfo.payee;

        for (uint8 i = 1; i <= 6; i++) {
            address nextPayee = signedOvers[chequeInfo.chequeId][i][
                _payees[i - 1]
            ];
            if (nextPayee == address(0)) {
                break;
            }
            _payees[i] = nextPayee;
        }

        for (uint256 i = 0; i < signOverData.length; i++) {
            SignOverInfo memory signOverInfo = signOverData[i].signOverInfo;

            if (signOverInfo.chequeId != chequeInfo.chequeId) {
                continue;
            }

            if (!(signOverInfo.counter > 0 && signOverInfo.counter <= 6)) {
                continue;
            }

            if (!_checkSignOverInfo(signOverInfo, signOverData[i].sig)) {
                continue;
            }

            if (
                _payees[signOverInfo.counter - 1] == signOverInfo.oldPayee &&
                _payees[signOverInfo.counter] == signOverInfo.newPayee
            ) {
                _signs[signOverInfo.counter - 1] = true;
            }
        }

        for (uint8 i = 1; i <= 6; i++) {
            if (_payees[i] == address(0)) {
                lastPayee = _payees[i - 1];
                break;
            }

            if (_signs[i - 1] == false) {
                break;
            }
        }
    }

    function _checkChequeInfo(
        ChequeInfo memory chequeInfo,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 message = _prefixed(
            keccak256(
                abi.encodePacked(
                    chequeInfo.chequeId,
                    chequeInfo.payer,
                    chequeInfo.payee,
                    chequeInfo.amount,
                    address(this),
                    chequeInfo.validFrom,
                    chequeInfo.validThru
                )
            )
        );

        return _recoverSigner(message, signature) == chequeInfo.payer;
    }

    function _checkSignOverInfo(
        SignOverInfo memory signOverInfo,
        bytes memory signature
    ) internal pure returns (bool) {
        bytes32 message = _prefixed(
            keccak256(
                abi.encodePacked(
                    SIGN_OVER_MAGIC,
                    signOverInfo.counter,
                    signOverInfo.chequeId,
                    signOverInfo.oldPayee,
                    signOverInfo.newPayee
                )
            )
        );

        return _recoverSigner(message, signature) == signOverInfo.oldPayee;
    }

    function _withdraw(uint256 amount, address payable recipient) internal {
        require(
            balances[msg.sender] > amount,
            "ChequeBankImplement: insufficent fund to withdraw"
        );

        balances[msg.sender] -= amount;
        payable(recipient).transfer(amount);
    }

    function _recoverSigner(bytes32 message, bytes memory signature)
        internal
        pure
        returns (address)
    {
        require(signature.length == 65);

        uint8 v;
        bytes32 r;
        bytes32 s;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(message, v, r, s);
    }

    function _prefixed(bytes32 hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }
}
