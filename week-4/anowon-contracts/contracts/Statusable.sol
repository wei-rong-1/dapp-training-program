// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Statusable {
    enum Status {
        PENDING,
        PREPARING,
        REVEALING,
        DONE
    }

    Status public status;

    modifier onlyStatus(Status _status) {
        _checkStatus(_status);
        _;
    }

    constructor() {
        status = Status.PENDING;
    }

    function _checkStatus(Status _status) internal view {
        require(status == _status, string(abi.encodePacked("Statusable: status is not right")));
    }

    function _prepare() internal {
        require(
            status == Status.PENDING,
            "Lottery: can only prepare at pending status"
        );

        _beforePrepare();
        status = Status.PREPARING;
        _afterPrepare();
    }

    function _reveal() internal {
        require(
            status == Status.PREPARING,
            "Lottery: can only reveal at preparing status"
        );

        _beforeReveal();
        status = Status.REVEALING;
        _afterReveal();
    }

    function _finalize() internal {
        require(
            status == Status.REVEALING,
            "Lottery: can only finalize at revealing status"
        );

        _beforeFinalize();
        status = Status.DONE;
        _afterFinalize();
    }

    function _beforePrepare() internal virtual {}

    function _afterPrepare() internal virtual {}
    
    function _beforeReveal() internal virtual {}

    function _afterReveal() internal virtual {}

    function _beforeFinalize() internal virtual {}

    function _afterFinalize() internal virtual {}
}