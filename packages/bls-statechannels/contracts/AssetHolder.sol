pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./interfaces/IAssetHolder.sol";
import { OutcomeFormat as Outcome } from './Outcome.sol';
import './BLSMove.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './StatusManager.sol';

contract AssetHolder is IAssetHolder, StatusManager {
    using SafeMath for uint256;

    mapping(address => mapping(bytes32 => uint256)) public holdings;

    // **************
    // External methods
    // **************

    /**
     * @notice Deposit ETH or erc20 tokens against a given channelId.
     * @dev Deposit ETH or erc20 tokens against a given channelId.
     * @param asset erc20 token address, or zero address to indicate ETH
     * @param channelId ChannelId to be credited.
     * @param expectedHeld The number of wei/tokens the depositor believes are _already_ escrowed against the channelId.
     * @param amount The intended number of wei/tokens to be deposited.
     */
    function deposit(
        address asset,
        bytes32 channelId,
        uint256 expectedHeld,
        uint256 amount
    ) external override payable {
        require(!_isExternalDestination(channelId), 'Deposit to external destination');
        uint256 amountDeposited;
        // this allows participants to reduce the wait between deposits, while protecting them from losing funds by depositing too early. Specifically it protects against the scenario:
        // 1. Participant A deposits
        // 2. Participant B sees A's deposit, which means it is now safe for them to deposit
        // 3. Participant B submits their deposit
        // 4. The chain re-orgs, leaving B's deposit in the chain but not A's
        uint256 held = holdings[asset][channelId];
        require(held >= expectedHeld, 'holdings < expectedHeld');
        require(held < expectedHeld.add(amount), 'holdings already sufficient');

        // The depositor wishes to increase the holdings against channelId to amount + expectedHeld
        // The depositor need only deposit (at most) amount + (expectedHeld - holdings) (the term in parentheses is non-positive)

        amountDeposited = expectedHeld.add(amount).sub(held); // strictly positive
        // require successful deposit before updating holdings (protect against reentrancy)
        if (asset == address(0)) {
            require(msg.value == amount, 'Incorrect msg.value for deposit');
        } else {
            // require successful deposit before updating holdings (protect against reentrancy)
            require(
                IERC20(asset).transferFrom(msg.sender, address(this), amountDeposited),
                'Could not deposit ERC20s'
            );
        }

        uint256 nowHeld = held.add(amountDeposited);
        holdings[asset][channelId] = nowHeld;
        emit Deposited(channelId, asset, amountDeposited, nowHeld);

        uint256 refund = amount.sub(amountDeposited);
        if (asset == address(0) && refund != 0) {
            // refund whatever wasn't deposited.
            (bool success, ) = msg.sender.call{value: refund}(''); //solhint-disable-line avoid-low-level-calls
            require(success, 'Could not refund excess funds');
        }
    }

    // /**
    //  * @notice Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
    //  * @dev Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
    //  * @param assetIndex Will be used to slice the outcome into a single asset outcome.
    //  * @param fromChannelId Unique identifier for state channel to transfer funds *from*.
    //  * @param outcomeBytes The encoded Outcome of this state channel
    //  * @param stateHash The hash of the state stored when the channel finalized.
    //  * @param indices Array with each entry denoting the index of a destination to transfer funds to. An empty array indicates "all".
    //  */
    // function transfer(
    //     uint256 assetIndex, // TODO consider a uint48?
    //     bytes32 fromChannelId,
    //     bytes memory outcomeBytes,
    //     bytes32 stateHash,
    //     uint256[] memory indices
    // ) external override {
    //     (
    //         Outcome.SingleAssetExit[] memory outcome,
    //         address asset,
    //         uint256 initialAssetHoldings
    //     ) = _apply_transfer_checks(assetIndex, indices, fromChannelId, stateHash, outcomeBytes); // view
    //
    //     (
    //         Outcome.Allocation[] memory newAllocations,
    //         ,
    //         Outcome.Allocation[] memory exitAllocations,
    //         uint256 totalPayouts
    //     ) = compute_transfer_effects_and_interactions(
    //         initialAssetHoldings,
    //         outcome[assetIndex].allocations,
    //         indices
    //     ); // pure, also performs checks
    //
    //     _apply_transfer_effects(
    //         assetIndex,
    //         asset,
    //         fromChannelId,
    //         stateHash,
    //         outcome,
    //         newAllocations,
    //         initialAssetHoldings,
    //         totalPayouts
    //     );
    //     _apply_transfer_interactions(outcome[assetIndex], exitAllocations);
    // }
    //
    // function _apply_transfer_checks(
    //     uint256 assetIndex,
    //     uint256[] memory indices,
    //     bytes32 channelId,
    //     bytes32 stateHash,
    //     bytes memory outcomeBytes
    // )
    //     internal
    //     view
    //     returns (
    //         Outcome.SingleAssetExit[] memory outcome,
    //         address asset,
    //         uint256 initialAssetHoldings
    //     )
    // {
    //     _requireIncreasingIndices(indices); // This assumption is relied on by compute_transfer_effects_and_interactions
    //     _requireChannelFinalized(channelId);
    //     _requireMatchingFingerprint(stateHash, keccak256(outcomeBytes), channelId);
    //
    //     outcome = Outcome.decodeExit(outcomeBytes);
    //     asset = outcome[assetIndex].asset;
    //     initialAssetHoldings = holdings[asset][channelId];
    // }
    //
    function compute_transfer_effects_and_interactions(
        uint256 initialHoldings,
        Outcome.Allocation[] memory allocations,
        uint256[] memory indices
    )
        public
        pure
        returns (
            Outcome.Allocation[] memory newAllocations,
            bool allocatesOnlyZeros,
            Outcome.Allocation[] memory exitAllocations,
            uint256 totalPayouts
        )
    {
        // `indices == []` means "pay out to all"
        // Note: by initializing exitAllocations to be an array of fixed length, its entries are initialized to be `0`
        exitAllocations = new Outcome.Allocation[](
            indices.length > 0 ? indices.length : allocations.length
        );
        totalPayouts = 0;
        newAllocations = new Outcome.Allocation[](allocations.length);
        allocatesOnlyZeros = true; // switched to false if there is an item remaining with amount > 0
        uint256 surplus = initialHoldings; // tracks funds available during calculation
        uint256 k = 0; // indexes the `indices` array

        // loop over allocations and decrease surplus
        for (uint256 i = 0; i < allocations.length; i++) {
            // copy destination, allocationType and metadata parts
            newAllocations[i].destination = allocations[i].destination;
            // newAllocations[i].allocationType = allocations[i].allocationType;
            newAllocations[i].metadata = allocations[i].metadata;
            // compute new amount part
            uint256 affordsForDestination = min(allocations[i].amount, surplus);
            if ((indices.length == 0) || ((k < indices.length) && (indices[k] == i))) {
                // if (allocations[k].allocationType == uint8(Outcome.AllocationType.guarantee))
                //     revert('cannot transfer a guarantee');
                // found a match
                // reduce the current allocationItem.amount
                newAllocations[i].amount = allocations[i].amount - affordsForDestination;
                // increase the relevant exit allocation
                exitAllocations[k] = Outcome.Allocation(
                    allocations[i].destination,
                    affordsForDestination,
                    // allocations[i].allocationType,
                    allocations[i].metadata
                );
                totalPayouts += affordsForDestination;
                // move on to the next supplied index
                ++k;
            } else {
                newAllocations[i].amount = allocations[i].amount;
            }
            if (newAllocations[i].amount != 0) allocatesOnlyZeros = false;
            // decrease surplus by the current amount if possible, else surplus goes to zero
            surplus -= affordsForDestination;
        }
    }
    //
    // function _apply_transfer_effects(
    //     uint256 assetIndex,
    //     address asset,
    //     bytes32 channelId,
    //     bytes32 stateHash,
    //     Outcome.SingleAssetExit[] memory outcome,
    //     Outcome.Allocation[] memory newAllocations,
    //     uint256 initialHoldings,
    //     uint256 totalPayouts
    // ) internal {
    //     // update holdings
    //     holdings[asset][channelId] -= totalPayouts;
    //
    //     // store fingerprint of modified outcome
    //     outcome[assetIndex].allocations = newAllocations;
    //     _updateFingerprint(channelId, stateHash, keccak256(abi.encode(outcome)));
    //
    //     // emit the information needed to compute the new outcome stored in the fingerprint
    //     emit AllocationUpdated(channelId, assetIndex, initialHoldings);
    // }
    //
    // function _apply_transfer_interactions(
    //     Outcome.SingleAssetExit memory singleAssetExit,
    //     Outcome.Allocation[] memory exitAllocations
    // ) internal {
    //     // create a new tuple to avoid mutating singleAssetExit
    //     _executeSingleAssetExit(
    //         Outcome.SingleAssetExit(
    //             singleAssetExit.asset,
    //             singleAssetExit.metadata,
    //             exitAllocations
    //         )
    //     );
    // }
    //
    // /**
    //  * @notice Checks that a given variables hash to the data stored on chain.
    //  * @dev Checks that a given variables hash to the data stored on chain.
    //  */

    function _executeSingleAssetExit(Outcome.Outcome memory singleAssetExit) internal {
      address asset = singleAssetExit.asset;
      for (uint x; x < singleAssetExit.allocations.length; x++) {
        bytes32 destination = singleAssetExit.allocations[x].destination;
        uint amount = singleAssetExit.allocations[x].amount;
        if (_isExternalDestination(destination)) {
          _transferAsset(asset, _bytes32ToAddress(destination), amount);
        } else {
          holdings[asset][destination] += amount;
        }
      }
    }

    function _transferAsset(address asset, address destination, uint amount) internal {
      if (asset == address(0)) {
        (bool success, ) = destination.call{value: amount}('');
        require(success);
      } else {
        IERC20(asset).transfer(destination, amount);
      }
    }

    function _bytes32ToAddress(bytes32 destination) internal pure returns (address payable) {
      return address(uint160(uint256(destination)));
    }

    function _requireMatchingFingerprint(
        bytes32 stateHash,
        bytes32 outcomeHash,
        bytes32 channelId
    ) internal view {
        (, , uint160 fingerprint) = _unpackStatus(channelId);
        require(
            fingerprint == _generateFingerprint(stateHash, outcomeHash),
            'incorrect fingerprint'
        );
    }
    /**
     * @notice Checks if a given destination is external (and can therefore have assets transferred to it) or not.
     * @dev Checks if a given destination is external (and can therefore have assets transferred to it) or not.
     * @param destination Destination to be checked.
     * @return True if the destination is external, false otherwise.
     */
    function _isExternalDestination(bytes32 destination) internal pure returns (bool) {
        return uint96(bytes12(destination)) == 0;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? b : a;
    }

    /**
     * @notice Checks that a given channel is in the Finalized mode.
     * @dev Checks that a given channel is in the Finalized mode.
     * @param channelId Unique identifier for a channel.
     */
    function _requireChannelFinalized(bytes32 channelId) internal view {
        require(_mode(channelId) == ChannelMode.Finalized, 'Channel not finalized.');
    }

    function _updateFingerprint(
        bytes32 channelId,
        bytes32 stateHash,
        bytes32 outcomeHash
    ) internal {
        (uint48 turnNumRecord, uint48 finalizesAt, ) = _unpackStatus(channelId);

        bytes32 newStatus = _generateStatus(
            ChannelData(turnNumRecord, finalizesAt, stateHash, outcomeHash)
        );
        statusOf[channelId] = newStatus;
    }
}
