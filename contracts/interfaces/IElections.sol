pragma solidity 0.5.16;

import "../spec_interfaces/IContractRegistry.sol";
import "../IStakeChangeNotifier.sol";

/// @title Elections contract interface
interface IElections /* is IStakeChangeNotifier */ {
	event CommitteeChanged(address[] addrs, address[] orbsAddrs, uint256[] stakes);
	event TopologyChanged(address[] orbsAddrs, bytes4[] ips);
	event VoteOut(address voter, address against);
	event VotedOutOfCommittee(address addr);
	event BanningVote(address voter, address[] against);
	event Delegated(address from, address to);
	event StakeChanged(address addr, uint256 ownStake, uint256 uncappedStake, uint256 governanceStake, uint256 committeeStake, uint256 totalGovernanceStake);
	event Banned(address validator);
	event Unbanned(address validator);

	/*
	 *   External methods
	 */

	/// @dev Called by a validator when ready to start syncing with other nodes
	function notifyReadyToSync() external;

	/// @dev Called by a validator when ready to join the committee, typically after syncing is complete or after being voted out
	function notifyReadyForCommittee() external;

	/// @dev Stake delegation
	function delegate(address to) external;

	/// @dev Called by a validator as part of the automatic vote-out flow
	function voteOut(address addr) external;

	/// @dev Refreshes the staking information (and the corresponding rank in committee and topology) for the given addresses.
	function refreshStakes(address[] calldata addrs) external;

	/// @dev casts a banning vote by the sender to the given address
	function setBanningVotes(address[] calldata addrs) external;

	/*
	 *   Methods restricted to other Orbs contracts
	 */

	/// @dev Called by: staking contract
	/// Notifies a batch of stake updates
	function stakeChangeBatch(address[] calldata _stakeOwners, uint256[] calldata _amounts, bool[] calldata _signs,
		uint256[] calldata _updatedStakes) external /* onlyStakingContract */;

	/// @dev Called by: staking contract
	/// Notifies an stake change event
	function stakeChange(address _stakeOwner, uint256 _amount, bool _sign, uint256 _updatedStake) external /* onlyStakingContract */;

	/// @dev Called by: staking contract
	/// Notifies an stake migration event
	function stakeMigration(address _stakeOwner, uint256 _amount) external /* onlyStakingContract */;

	/// @dev Called by: validator registration contract
	/// Notifies a new validator was registered
	function validatorRegistered(address addr) external /* onlyValidatorsRegistrationContract */;

	/// @dev Called by: validator registration contract
	/// Notifies a new validator was unregistered
	function validatorUnregistered(address addr) external /* onlyValidatorsRegistrationContract */;

	/// @dev Called by: validator registration contract
	/// Notifies on a validator compliance change
	function validatorConformanceChanged(address addr, string calldata conformanceType) external /* onlyComplianceContract */;

	/*
	 * Governance
	 */

	/// @dev Updates the address calldata of the contract registry
	function setContractRegistry(IContractRegistry _contractRegistry) external /* onlyOwner */;

}
