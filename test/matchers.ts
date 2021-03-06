import BN from "bn.js";

import {
  delegatedEvents,
  stakedEvents,
  stakeChangedEvents,
  subscriptionChangedEvents,
  paymentEvents,
  feesAddedToBucketEvents,
  unstakedEvents,
  voteOutEvents,
  votedOutOfCommitteeEvents,
  vcConfigRecordChangedEvents,
  contractAddressUpdatedEvents,
  protocolChangedEvents,
  banningVoteEvents,
  electionsBanned,
  electionsUnbanned,
  vcOwnerChangedEvents,
  feesAssignedEvents,
  bootstrapAddedToPoolEvents,
  stakingRewardAssignedEvents,
  bootstrapRewardsAssignedEvents,
  validatorConformanceUpdateEvents,
  vcCreatedEvents,
  validatorRegisteredEvents,
  validatorUnregisteredEvents,
  validatorDataUpdatedEvents,
  validatorMetadataChangedEvents, committeeChangedEvents, standbysChangedEvents
} from "./event-parsing";
import * as _ from "lodash";
import chai from "chai";
import {
  SubscriptionChangedEvent,
  PaymentEvent, VcConfigRecordChangedEvent, VcOwnerChangedEvent, VcCreatedEvent
} from "../typings/subscriptions-contract";
import {
  DelegatedEvent,
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
import {FeesAddedToBucketEvent, FeesAssignedEvent} from "../typings/fees-contract";
import {
  ValidatorDataUpdatedEvent, ValidatorMetadataChangedEvent,
  ValidatorRegisteredEvent,
  ValidatorUnregisteredEvent
} from "../typings/validator-registration-contract";
import {CommitteeChangedEvent, StandbysChangedEvent} from "../typings/committee-contract";
import {ValidatorConformanceUpdateEvent} from "../typings/compliance-contract";
import {Contract} from "../eth";

export function isBNArrayEqual(a1: Array<any>, a2: Array<any>): boolean {
  return (
    a1.length == a2.length &&
    a1.find((v, i) => !new BN(a1[i]).eq(new BN(a2[i]))) == null
  );
}

function comparePrimitive(a: any, b: any): boolean {
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

function transpose(obj, key, fields?) {
  if (Object.keys(obj || {}).length == 0) {
    return {}
  }
  const transposed: {[key: string]: any} = [];
  const n = _.values(obj)[0].length;
  fields = fields || Object.keys(obj);
  for (let i = 0; i < n; i++) {
    const item = {};
    for (let k of fields) {
      item[k] = obj[k][i];
    }
    transposed[item[key]] = item;
  }
  return transposed;
}

function objectMatches(obj, against): boolean {
    if (obj == null || against == null) return false;

    for (const k in against) {
      if (!comparePrimitive(obj[k], against[k])) {
        return false;
      }
    }
    return true;
}

function compare(event: any, against: any, transposed?: boolean, key?: string): boolean {
  if (transposed) {
    const fields = Object.keys(against);
    event = transpose(event, key, fields);
    against = transpose(against, key);
    return  Object.keys(against).length == Object.keys(event).length &&
        Object.keys(against).find(key => !objectMatches(event[key], against[key])) == null;
  } else {
    return objectMatches(event, against);
  }
}

function stripEvent(event) {
  return _.pickBy(event, (v, k) => /[_0-9]/.exec(k[0]) == null);
}

const containEvent = (eventParser, transposed?: boolean, key?: string) =>
  function(_super) {
    return function(this: any, data) {
      data = data || {};

      const contractAddress = chai.util.flag(this, "contractAddress");
      const logs = eventParser(this._obj, contractAddress).map(stripEvent);

      this.assert(
        logs.length != 0,
        "expected the event to exist",
        "expected no event to exist"
      );

      if (logs.length == 1) {
        const log = logs.pop();
        this.assert(
            compare(log, data, transposed, key),
            "expected #{this} to be #{exp} but got #{act}",
            "expected #{this} to not be #{act}",
            data, // expected
            log // actual
        );
      } else {
        for (const log of logs) {
          if (compare(log, data, transposed, key)) {
            return;
          }
        }
        this.assert(
          false,
          `No event with properties ${JSON.stringify(
            data
          )} found. Events are ${JSON.stringify(logs.map(l =>_.omitBy(l, (v, k) => /[0-9_]/.exec(k[0]))))}`
        ); // TODO make this log prettier
      }
    };
  };

module.exports = function(chai) {
  chai.Assertion.overwriteMethod("delegatedEvent", containEvent(delegatedEvents));
  chai.Assertion.overwriteMethod("validatorRegisteredEvent", containEvent(validatorRegisteredEvents));
  chai.Assertion.overwriteMethod("validatorUnregisteredEvent", containEvent(validatorUnregisteredEvents));
  chai.Assertion.overwriteMethod("validatorDataUpdatedEvent", containEvent(validatorDataUpdatedEvents));
  chai.Assertion.overwriteMethod("validatorMetadataChangedEvent", containEvent(validatorMetadataChangedEvents));
  chai.Assertion.overwriteMethod("committeeChangedEvent", containEvent(committeeChangedEvents, true, 'addrs'));
  chai.Assertion.overwriteMethod("standbysChangedEvent", containEvent(standbysChangedEvents, true, 'addrs'));
  chai.Assertion.overwriteMethod("stakeChangedEvent", containEvent(stakeChangedEvents));
  chai.Assertion.overwriteMethod("stakedEvent", containEvent(stakedEvents));
  chai.Assertion.overwriteMethod("unstakedEvent", containEvent(unstakedEvents));
  chai.Assertion.overwriteMethod("subscriptionChangedEvent", containEvent(subscriptionChangedEvents));
  chai.Assertion.overwriteMethod("paymentEvent", containEvent(paymentEvents));
  chai.Assertion.overwriteMethod("feeAddedToBucketEvent", containEvent(feesAddedToBucketEvents));
  chai.Assertion.overwriteMethod("bootstrapAddedToPoolEvent", containEvent(bootstrapAddedToPoolEvents));
  chai.Assertion.overwriteMethod("bootstrapRewardsAssignedEvent", containEvent(bootstrapRewardsAssignedEvents, true, 'assignees'));
  chai.Assertion.overwriteMethod("stakingRewardAssignedEvent", containEvent(stakingRewardAssignedEvents, true, 'assignees'));
  chai.Assertion.overwriteMethod("feesAssignedEvent", containEvent(feesAssignedEvents, true, 'assignees'));
  chai.Assertion.overwriteMethod("feesAddedToBucketEvent", containEvent(feesAddedToBucketEvents));
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

  chai.Assertion.addChainableMethod("withinContract", function (this: any, contract: Contract) {
    chai.util.flag(this, "contractAddress", contract.address);
  })
};

declare global {
  export namespace Chai {
    export interface TypeComparison {
      delegatedEvent(data?: Partial<DelegatedEvent>): void;
      committeeChangedEvent(data?: Partial<CommitteeChangedEvent>): void;
      standbysChangedEvent(data?: Partial<StandbysChangedEvent>): void;
      validatorRegisteredEvent(data?: Partial<ValidatorRegisteredEvent>): void;
      validatorMetadataChangedEvent(data?: Partial<ValidatorMetadataChangedEvent>): void;
      validatorUnregisteredEvent(data?: Partial<ValidatorUnregisteredEvent>): void;
      validatorDataUpdatedEvent(data?: Partial<ValidatorDataUpdatedEvent>): void;
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
      feesAddedToBucketEvent(data?: Partial<FeesAddedToBucketEvent>);
      bootstrapRewardsAssignedEvent(data?: Partial<BootstrapRewardsAssignedEvent>)
      bootstrapAddedToPoolEvent(data?: Partial<BootstrapAddedToPoolEvent>)
      withinContract(contract: Contract): Assertion;
    }

    export interface Assertion {
      bignumber: Assertion;
      haveCommittee(data: CommitteeChangedEvent);
    }
  }
}
