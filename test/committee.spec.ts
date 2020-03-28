import 'mocha';

import * as _ from "lodash";
import Web3 from "web3";
declare const web3: Web3;

import BN from "bn.js";
import {
    defaultDriverOptions,
    BANNING_LOCK_TIMEOUT,
    Driver,
    expectRejected,
    Participant
} from "./driver";
import chai from "chai";
chai.use(require('chai-bn')(BN));
chai.use(require('./matchers'));

const expect = chai.expect;
const assert = chai.assert;

import {bn, evmIncreaseTime} from "./helpers";
import {ETHEREUM_URL} from "../eth";


describe('committee', async () => {

    // Basic tests: standbys, committee

    it('becomes standby only after ready-to-sync', async () => {
        const d = await Driver.new();

        const stake = 100;
        const v = await d.newParticipant();

        let r = await v.registerAsValidator();
        expect(r).to.not.have.a.standbysChangedEvent();
        expect(r).to.not.have.a.committeeChangedEvent();

        r = await v.stake(stake);
        expect(r).to.not.have.a.standbysChangedEvent();
        expect(r).to.not.have.a.committeeChangedEvent();

        r = await v.notifyReadyToSync();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v.address],
            orbsAddrs: [v.orbsAddress],
            weights: [bn(stake)]
        });
        expect(r).to.not.have.a.committeeChangedEvent();
    });

    it('joins committee and leaves standbys only after ready-for-committee', async () => {
        const d = await Driver.new();

        const stake = 100;
        const v = await d.newParticipant();

        let r = await v.registerAsValidator();
        expect(r).to.not.have.a.standbysChangedEvent();
        expect(r).to.not.have.a.committeeChangedEvent();

        r = await v.stake(stake);
        expect(r).to.not.have.a.standbysChangedEvent();
        expect(r).to.not.have.a.committeeChangedEvent();

        r = await v.notifyReadyToSync();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v.address],
            orbsAddrs: [v.orbsAddress],
            weights: [bn(stake)]
        });
        expect(r).to.not.have.a.committeeChangedEvent();

        r = await v.notifyReadyForCommittee();
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [v.address],
            orbsAddrs: [v.orbsAddress],
            weights: [bn(stake)]
        });
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [],
            orbsAddrs: [],
            weights: []
        });
    });

    it('joins straight to committee on ready-for-committee', async () => {
        const d = await Driver.new();

        const stake = 100;
        const v = await d.newParticipant();

        let r = await v.registerAsValidator();
        expect(r).to.not.have.a.standbysChangedEvent();
        expect(r).to.not.have.a.committeeChangedEvent();

        r = await v.stake(stake);
        expect(r).to.not.have.a.standbysChangedEvent();
        expect(r).to.not.have.a.committeeChangedEvent();

        r = await v.notifyReadyForCommittee();
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [v.address],
            orbsAddrs: [v.orbsAddress],
            weights: [bn(stake)]
        });
        expect(r).to.not.have.a.standbysChangedEvent();
    });

    it('does not allow more than maxStandbys', async () => {
        const d = await Driver.new();

        const stake = 100;
        const standbys: Participant[] = [];

        for (let i = 0; i < defaultDriverOptions.maxStandbys; i++) {
            const v = await d.newParticipant();
            standbys.push(v);

            await v.registerAsValidator();
            await v.stake(stake);
            let r = await v.notifyReadyToSync();
            expect(r).to.have.a.standbysChangedEvent({
                addrs: standbys.map(s => s.address),
                orbsAddrs: standbys.map(s => s.orbsAddress),
                weights: standbys.map(s => bn(stake))
            });
            expect(r).to.not.have.a.committeeChangedEvent();
        }

        const v = await d.newParticipant();
        await v.registerAsValidator();
        await v.stake(stake);
        let r = await v.notifyReadyToSync();
        expect(r).to.not.have.a.standbysChangedEvent();
        expect(r).to.not.have.a.committeeChangedEvent();
    });

    it('does not allow more than maxCommitteeSize', async () => {
        const d = await Driver.new();

        const stake = 100;
        const committee: Participant[] = [];

        for (let i = 0; i < defaultDriverOptions.maxCommitteeSize; i++) {
            const v = await d.newParticipant();
            committee.push(v);

            await v.registerAsValidator();
            await v.stake(stake);
            let r = await v.notifyReadyForCommittee();
            expect(r).to.have.a.committeeChangedEvent({
                addrs: committee.map(s => s.address),
                orbsAddrs: committee.map(s => s.orbsAddress),
                weights: committee.map(s => bn(stake))
            });
            expect(r).to.not.have.a.standbysChangedEvent();
        }

        const v = await d.newParticipant();
        await v.registerAsValidator();
        await v.stake(stake);
        let r = await v.notifyReadyForCommittee();
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v.address]
        });
    });

    it('standby can overtake committee member with more stake', async () => {
        const d = await Driver.new();

        const stake = 100;
        const committee: Participant[] = [];

        for (let i = 0; i < defaultDriverOptions.maxCommitteeSize; i++) {
            const v = await d.newParticipant();
            committee.push(v);

            await v.registerAsValidator();
            await v.stake(stake);
            let r = await v.notifyReadyForCommittee();
            expect(r).to.have.a.committeeChangedEvent({
                addrs: committee.map(s => s.address),
                orbsAddrs: committee.map(s => s.orbsAddress),
                weights: committee.map(s => bn(stake))
            });
            expect(r).to.not.have.a.standbysChangedEvent();
        }

        const v = await d.newParticipant();
        await v.registerAsValidator();
        await v.stake(stake);
        let r = await v.notifyReadyForCommittee();
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v.address]
        });

        r = await v.stake(stake);
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [v].concat(committee.slice(0, committee.length - 1)).map(s => s.address),
        });
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [committee[committee.length - 1].address],
        });

    });

    it('non-committe-ready standby with more stake cannot overtake a committee member', async () => {
        const d = await Driver.new();

        const stake = 100;
        const committee: Participant[] = [];

        for (let i = 0; i < defaultDriverOptions.maxCommitteeSize; i++) {
            const v = await d.newParticipant();
            committee.push(v);

            await v.registerAsValidator();
            await v.stake(stake);
            let r = await v.notifyReadyForCommittee();
            expect(r).to.have.a.committeeChangedEvent({
                addrs: committee.map(s => s.address),
                orbsAddrs: committee.map(s => s.orbsAddress),
                weights: committee.map(s => bn(stake))
            });
            expect(r).to.not.have.a.standbysChangedEvent();
        }

        const v = await d.newParticipant();
        await v.registerAsValidator();
        await v.stake(stake);
        let r = await v.notifyReadyToSync();
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v.address]
        });

        r = await v.stake(stake);
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v.address],
            weights: [bn(2 * stake)]
        });

    });

    it('two non-ready-for-committee with more stake can overtake two ready-for-committee standbys', async () => {
        const maxStandbys = 3;
        const d = await Driver.new({maxStandbys});

        const stake = 100;
        const committee: Participant[] = [];

        for (let i = 0; i < defaultDriverOptions.maxCommitteeSize; i++) {
            const v = await d.newParticipant();
            committee.push(v);

            await v.registerAsValidator();
            await v.stake(stake * 2);
            let r = await v.notifyReadyForCommittee();
            expect(r).to.have.a.committeeChangedEvent({
                addrs: committee.map(s => s.address),
                orbsAddrs: committee.map(s => s.orbsAddress),
            });
            expect(r).to.not.have.a.standbysChangedEvent();
        }

        const standbys: Participant[] = [];

        for (let i = 0; i < maxStandbys; i++) {
            const v = await d.newParticipant();
            standbys.push(v);

            await v.registerAsValidator();
            await v.stake(i <= 1 ? stake: stake * 2);
            let r = i <= 1 ? await v.notifyReadyForCommittee() : await v.notifyReadyToSync();
            expect(r).to.have.a.standbysChangedEvent({
                addrs: standbys.map(s => s.address),
                orbsAddrs: standbys.map(s => s.orbsAddress),
            });
            expect(r).to.not.have.a.committeeChangedEvent();
        }

        const v1 = await d.newParticipant();
        await v1.registerAsValidator();
        await v1.stake(stake + 2);
        let r = await v1.notifyReadyToSync();
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [standbys[0], standbys[2], v1].map(s => s.address)
        });

        const v2 = await d.newParticipant();
        await v2.registerAsValidator();
        await v2.notifyReadyToSync();
        r = await v2.stake(stake + 1);
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [standbys[2], v1, v2].map(s => s.address)
        });

    });

    // Ready-To-Sync timeout related tests

    it('two ready-for-sync with less stake can overtake two timed-out standbys', async () => {
        const maxStandbys = 2;
        const readyToSyncTimeout = 30*24*60*60;
        const d = await Driver.new({maxStandbys, readyToSyncTimeout});

        const stake = 100;

        const standbys: Participant[] = [];
        for (let i = 0; i < maxStandbys; i++) {
            const v = await d.newParticipant();
            standbys.push(v);

            await v.registerAsValidator();
            await v.stake(stake);
            let r = await v.notifyReadyToSync();
            expect(r).to.have.a.standbysChangedEvent({
                addrs: standbys.map(s => s.address),
                orbsAddrs: standbys.map(s => s.orbsAddress),
            });
            expect(r).to.not.have.a.committeeChangedEvent();
        }

        await evmIncreaseTime(d.web3, readyToSyncTimeout);

        const v1 = await d.newParticipant();
        await v1.registerAsValidator();
        await v1.stake(stake - 1);
        let r = await v1.notifyReadyToSync();
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [standbys[1], v1].map(s => s.address)
        });

        const v2 = await d.newParticipant();
        await v2.registerAsValidator();
        await v2.notifyReadyToSync();
        r = await v2.stake(stake - 1);
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v1, v2].map(s => s.address)
        });

    });

    it('an out-ranked committee member can become standby even with stale readyToSync', async () => {
        const maxStandbys = 1;
        const maxCommitteeSize = 1;
        const readyToSyncTimeout = 30*24*60*60;
        const d = await Driver.new({maxStandbys, readyToSyncTimeout, maxCommitteeSize});

        const stake = 100;

        const v1 = await d.newParticipant();
        await v1.registerAsValidator();
        await v1.stake(stake);
        let r = await v1.notifyReadyForCommittee();
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [v1.address],
            orbsAddrs: [v1.orbsAddress],
        });
        expect(r).to.not.have.a.standbysChangedEvent();

        await evmIncreaseTime(d.web3, readyToSyncTimeout);

        const v2 = await d.newParticipant();
        await v2.registerAsValidator();
        await v2.stake(stake + 1);
        r = await v2.notifyReadyForCommittee();
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [v2.address],
            orbsAddrs: [v2.orbsAddress],
        });
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v1.address],
            orbsAddrs: [v1.orbsAddress],
        });
    });

    it('a stale readyToSync does not get a validator evicted from committee', async () => {
        const maxStandbys = 1;
        const maxCommitteeSize = 1;
        const readyToSyncTimeout = 30*24*60*60;
        const d = await Driver.new({maxStandbys, readyToSyncTimeout, maxCommitteeSize});

        const stake = 100;

        const v1 = await d.newParticipant();
        await v1.registerAsValidator();
        await v1.stake(stake);
        let r = await v1.notifyReadyForCommittee();
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [v1.address],
            orbsAddrs: [v1.orbsAddress],
        });
        expect(r).to.not.have.a.standbysChangedEvent();

        await evmIncreaseTime(d.web3, readyToSyncTimeout);

        const v2 = await d.newParticipant();
        await v2.registerAsValidator();
        await v2.stake(stake - 1);
        r = await v2.notifyReadyForCommittee();
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v2.address],
            orbsAddrs: [v2.orbsAddress],
        });
    });

    it('stake change does not count as a readyToSync notification', async () => {
        const maxStandbys = 1;
        const readyToSyncTimeout = 30*24*60*60;
        const d = await Driver.new({maxStandbys, readyToSyncTimeout});

        const stake = 100;

        const v1 = await d.newParticipant();
        await v1.registerAsValidator();
        await v1.stake(stake);
        let r = await v1.notifyReadyToSync();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v1.address],
            orbsAddrs: [v1.orbsAddress],
        });
        expect(r).to.not.have.a.committeeChangedEvent();

        await evmIncreaseTime(d.web3, readyToSyncTimeout);

        r = await v1.stake(1);
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({ // due to weight change
            addrs: [v1.address],
            orbsAddrs: [v1.orbsAddress],
        });

        // v1 is still timed-out so a new validator with less stake should overtake

        const v2 = await d.newParticipant();
        await v2.registerAsValidator();
        await v2.stake(stake);
        r = await v2.notifyReadyToSync();
        expect(r).to.not.have.a.committeeChangedEvent();
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v2.address],
            orbsAddrs: [v2.orbsAddress],
        });
    });

    // Min-Stake and Min-Committee

    it('joins committee only if has min-stake (min-committee == 0)', async () => {
        const stake = 100;
        const generalCommitteeMinStake = stake;
        const minCommitteeSize = 0;
        const maxCommitteeSize = 2;
        const d = await Driver.new({minCommitteeSize, maxCommitteeSize, generalCommitteeMinStake});

        const standbys: Participant[] = [];
        for (let i = 0; i < maxCommitteeSize; i++) {
            const v = await d.newParticipant();
            standbys.push(v);
            await v.registerAsValidator();
            await v.stake(stake - 1);
            let r = await v.notifyReadyForCommittee();
            expect(r).to.have.a.standbysChangedEvent({
                addrs: standbys.map(s => s.address),
                orbsAddrs: standbys.map(s => s.orbsAddress),
            });
            expect(r).to.not.have.a.committeeChangedEvent();
        }
    });

    it('joins committee if current is smaller than min-committee even with less than min-stake', async () => {
        const stake = 100;
        const generalCommitteeMinStake = stake;
        const minCommitteeSize = 2;
        const maxCommitteeSize = 3;
        const d = await Driver.new({minCommitteeSize, maxCommitteeSize, generalCommitteeMinStake});

        const standbys: Participant[] = [];
        for (let i = 0; i < maxCommitteeSize; i++) {
            const v = await d.newParticipant();
            standbys.push(v);
            await v.registerAsValidator();
            await v.stake(stake - 1);
            let r = await v.notifyReadyForCommittee();
            if (i != maxCommitteeSize - 1) {
                expect(r).to.have.a.committeeChangedEvent({
                    addrs: standbys.map(s => s.address),
                    orbsAddrs: standbys.map(s => s.orbsAddress),
                });
                expect(r).to.not.have.a.standbysChangedEvent();
            } else {
                expect(r).to.not.have.a.committeeChangedEvent();
                expect(r).to.have.a.standbysChangedEvent({
                    addrs: [standbys[maxCommitteeSize - 1].address],
                    orbsAddrs: [standbys[maxCommitteeSize - 1].orbsAddress]
                });
            }
        }
    });

    it('evicts a committee member which unstaked below the min-stake threshold', async () => {
        const stake = 100;
        const generalCommitteeMinStake = stake;
        const minCommitteeSize = 0;
        const maxCommitteeSize = 2;
        const readyToSyncTimeout = 30*24*60*60;
        const d = await Driver.new({minCommitteeSize, maxCommitteeSize, readyToSyncTimeout, generalCommitteeMinStake});

        const v = await d.newParticipant();
        await v.registerAsValidator();
        await v.stake(stake);
        let r = await v.notifyReadyForCommittee();
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [v.address],
            orbsAddrs: [v.orbsAddress],
        });
        expect(r).to.not.have.a.standbysChangedEvent();

        r = await v.unstake(1);
        expect(r).to.have.a.standbysChangedEvent({
            addrs: [v.address],
            orbsAddrs: [v.orbsAddress],
        });
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [],
            orbsAddrs: [],
        });
    });

    it('does not evict a committee member which unstaked below the min-stake threshold because of min-committee', async () => {
        const stake = 100;
        const generalCommitteeMinStake = stake;
        const minCommitteeSize = 1;
        const maxCommitteeSize = 2;
        const d = await Driver.new({minCommitteeSize, maxCommitteeSize, generalCommitteeMinStake});

        const v = await d.newParticipant();
        await v.registerAsValidator();
        await v.stake(stake);
        let r = await v.notifyReadyForCommittee();
        expect(r).to.have.a.committeeChangedEvent({
            addrs: [v.address],
            orbsAddrs: [v.orbsAddress],
        });
        expect(r).to.not.have.a.standbysChangedEvent();

        r = await v.unstake(1);
        expect(r).to.not.have.a.standbysChangedEvent();
        expect(r).to.have.a.committeeChangedEvent({ // due to weight change
            addrs: [v.address],
            orbsAddrs: [v.orbsAddress],
        });
    })
});
