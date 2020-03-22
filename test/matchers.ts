import BN from "bn.js";

import {
  committeeChangedEvents,
  delegatedEvents,
  stakedEvents,
  stakeChangedEvents,
  validatorRegisteredEvents,
  subscriptionChangedEvents,
  paymentEvents,
  feesAddedToBucketEvents,
  unstakedEvents,
  topologyChangedEvents,
  voteOutEvents,
  votedOutOfCommitteeEvents,
  vcConfigRecordChangedEvents,
  contractAddressUpdatedEvents,
  protocolChangedEvents,
  banningVoteEvents,
  electionsBanned,
  electionsUnbanned,
  vcOwnerChangedEvents,
  vcCreatedEvents,
  bootstrapRewardAssignedEvents,
  feesAssignedEvents,
  bootstrapAddedToPoolEvents,
  stakingRewardAssignedEvents,
  bootstrapRewardsAssignedEvents,
  vcCreatedEvents,
  validatorConformanceUpdateEvents
} from "./event-parsing";
import * as _ from "lodash";
import {
  SubscriptionChangedEvent,
  PaymentEvent, VcConfigRecordChangedEvent, VcOwnerChangedEvent, VcCreatedEvent
} from "../typings/subscriptions-contract";
import {
  DelegatedEvent,
  CommitteeChangedEvent,
  TopologyChangedEvent,
  ValidatorRegisteredEvent,
  StakeChangeEvent,
  VoteOutEvent,
  VotedOutOfCommitteeEvent,
  BanningVoteEvent,
  BannedEvent,
  UnbannedEvent
} from "../typings/elections-contract";
import { StakedEvent, UnstakedEvent } from "../typings/staking-contract";
import {ContractAddressUpdatedEvent} from "../typings/contract-registry-contract";
import {ProtocolChangedEvent} from "../typings/protocol-contract";
import {StakingRewardAssignedEvent} from "../typings/staking-rewards-contract";
import {BootstrapAddedToPoolEvent, BootstrapRewardsAssignedEvent} from "../typings/bootstrap-rewards-contract";
import {FeesAssignedEvent} from "../typings/fees-contract";
import {ValidatorConformanceUpdateEvent} from "../typings/compliance-contract";

export function isBNArrayEqual(a1: Array<any>, a2: Array<any>): boolean {
  return (
    a1.length == a2.length &&
    a1.find((v, i) => !new BN(a1[i]).eq(new BN(a2[i]))) == null
  );
}

function compare(a: any, b: any): boolean {
  if (BN.isBN(a) || BN.isBN(b)) {
    return new BN(a).eq(new BN(b));
  } else {
    if (
      (Array.isArray(a) && BN.isBN(a[0])) ||
      (Array.isArray(b) && BN.isBN(b[0]))
    ) {
      return isBNArrayEqual(a, b);
    }
    return _.isEqual(a, b);
  }
}

const containEvent = eventParser =>
  function(_super) {
    return function(this: any, data) {
      data = data || {};

      const logs = eventParser(this._obj);

      this.assert(
        logs.length != 0,
        "expected the event to exist",
        "expected no event to exist"
      );

      if (logs.length == 1) {
        const log = logs.pop();
        for (const k in data) {
          this.assert(
            compare(data[k], log[k]),
            "expected #{this} to be #{exp} but got #{act}",
            "expected #{this} to not be #{act}",
            data[k], // expected
            log[k] // actual
          );
        }
      } else {
        for (const log of logs) {
          let foundDiff = false;
          for (const k in data) {
            if (!compare(data[k], log[k])) {
              foundDiff = true;
              break;
            }
          }
          if (!foundDiff) {
            return;
          }
        }
        this.assert(
          false,
          `No event with properties ${JSON.stringify(
            data
          )} found. Events are ${JSON.stringify(logs)}`
        ); // TODO make this log prettier
      }
    };
  };

module.exports = function(chai) {
  chai.Assertion.overwriteMethod("delegatedEvent", containEvent(delegatedEvents));
  chai.Assertion.overwriteMethod("validatorRegisteredEvent", containEvent(validatorRegisteredEvents));
  chai.Assertion.overwriteMethod("committeeChangedEvent", containEvent(committeeChangedEvents));
  chai.Assertion.overwriteMethod("stakeChangedEvent", containEvent(stakeChangedEvents));
  chai.Assertion.overwriteMethod("stakedEvent", containEvent(stakedEvents));
  chai.Assertion.overwriteMethod("unstakedEvent", containEvent(unstakedEvents));
  chai.Assertion.overwriteMethod("subscriptionChangedEvent", containEvent(subscriptionChangedEvents));
  chai.Assertion.overwriteMethod("paymentEvent", containEvent(paymentEvents));
  chai.Assertion.overwriteMethod("feeAddedToBucketEvent", containEvent(feesAddedToBucketEvents));
  chai.Assertion.overwriteMethod("bootstrapAddedToPoolEvent", containEvent(bootstrapAddedToPoolEvents));
  chai.Assertion.overwriteMethod("bootstrapRewardAssignedEvent", containEvent(bootstrapRewardAssignedEvents));
  chai.Assertion.overwriteMethod("stakingRewardAssignedEvent", containEvent(stakingRewardAssignedEvents));
  chai.Assertion.overwriteMethod("feesAssignedEvent", containEvent(feesAssignedEvents));
  chai.Assertion.overwriteMethod("bootstrapRewardsAssignedEvent", containEvent(bootstrapRewardsAssignedEvents));
  chai.Assertion.overwriteMethod("topologyChangedEvent", containEvent(topologyChangedEvents));
  chai.Assertion.overwriteMethod("voteOutEvent", containEvent(voteOutEvents));
  chai.Assertion.overwriteMethod("votedOutOfCommitteeEvent", containEvent(votedOutOfCommitteeEvents));
  chai.Assertion.overwriteMethod("banningVoteEvent", containEvent(banningVoteEvents));
  chai.Assertion.overwriteMethod("bannedEvent", containEvent(electionsBanned));
  chai.Assertion.overwriteMethod("unbannedEvent", containEvent(electionsUnbanned));
  chai.Assertion.overwriteMethod("vcConfigRecordChangedEvent", containEvent(vcConfigRecordChangedEvents));
  chai.Assertion.overwriteMethod("vcOwnerChangedEvent", containEvent(vcOwnerChangedEvents));
  chai.Assertion.overwriteMethod("vcCreatedEvent", containEvent(vcCreatedEvents));
  chai.Assertion.overwriteMethod("contractAddressUpdatedEvent", containEvent(contractAddressUpdatedEvents));
  chai.Assertion.overwriteMethod("protocolChangedEvent", containEvent(protocolChangedEvents));
  chai.Assertion.overwriteMethod("validatorConformanceUpdateEvent", containEvent(validatorConformanceUpdateEvents));

  chai.Assertion.overwriteMethod("haveCommittee", containEvent(function(o) {return [o];}));
};

declare global {
  export namespace Chai {
    export interface TypeComparison {
      delegatedEvent(data?: Partial<DelegatedEvent>): void;
      committeeChangedEvent(data?: Partial<CommitteeChangedEvent>): void;
      topologyChangedEvent(data?: Partial<TopologyChangedEvent>): void;
      validatorRegisteredEvent(data?: Partial<ValidatorRegisteredEvent>): void;
      stakeChangedEvent(data?: Partial<StakeChangeEvent>): void;
      stakedEvent(data?: Partial<StakedEvent>): void;
      unstakedEvent(data?: Partial<UnstakedEvent>): void;
      subscriptionChangedEvent(data?: Partial<SubscriptionChangedEvent>): void;
      paymentEvent(data?: Partial<PaymentEvent>): void;
      vcConfigRecordChangedEvent(data?: Partial<VcConfigRecordChangedEvent>): void;
      vcCreatedEvent(data?: Partial<VcCreatedEvent>): void;
      vcOwnerChangedEvent(data?: Partial<VcOwnerChangedEvent>): void;
      voteOutEvent(data?: Partial<VoteOutEvent>): void;
      votedOutOfCommitteeEvent(data?: Partial<VotedOutOfCommitteeEvent>): void;
      contractAddressUpdatedEvent(data?: Partial<ContractAddressUpdatedEvent>): void;
      banningVoteEvent(data?: Partial<BanningVoteEvent>): void;
      bannedEvent(data?: Partial<BannedEvent>): void;
      unbannedEvent(data?: Partial<UnbannedEvent>): void;
      protocolChangedEvent(data?: Partial<ProtocolChangedEvent>): void;
      validatorConformanceUpdateEvent(data?: Partial<ValidatorConformanceUpdateEvent>)
      stakingRewardAssignedEvent(data?: Partial<StakingRewardAssignedEvent>)
      feesAssignedEvent(data?: Partial<FeesAssignedEvent>)
      bootstrapRewardsAssignedEvent(data?: Partial<BootstrapRewardsAssignedEvent>)
      bootstrapAddedToPoolEvent(data?: Partial<BootstrapAddedToPoolEvent>)
    }

    export interface Assertion {
      bignumber: Assertion;
      haveCommittee(data: CommitteeChangedEvent);
    }
  }
}
