var Web3 = require('@vapory/web3');
var TestRPC = require("../index.js");
var assert = require('assert');

describe("Accounts", function() {
  var expected_address = "0x604a95C9165Bc95aE016a5299dd7d400dDDBEa9A";
  var mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";

  it("should respect the BIP99 mnemonic", function(done) {
    var web3 = new Web3();
    web3.setProvider(TestRPC.provider({
      mnemonic: mnemonic
    }));

    web3.vap.getAccounts(function(err, accounts) {
      if (err) return done(err);

      assert(accounts[0].toLowerCase(), expected_address.toLowerCase());
      done();
    });
  });

  it("should lock all accounts when specified", function(done) {
    var web3 = new Web3();
    web3.setProvider(TestRPC.provider({
      mnemonic: mnemonic,
      secure: true
    }));

    web3.vap.sendTransaction({
      from: expected_address,
      to: "0x1234567890123456789012345678901234567890", // doesn't need to exist
      value: web3.toWei(1, "Vapor"),
      gasLimit: 90000
    }, function(err, tx) {
      if (!err) return done(new Error("We expected the account to be locked, which should throw an error when sending a transaction"));
      assert(err.message.toLowerCase().indexOf("could not unlock signer account") >= 0);
      done();
    });
  });

  it("should unlock specified accounts, in conjunction with --secure", function(done) {
    var web3 = new Web3();
    web3.setProvider(TestRPC.provider({
      mnemonic: mnemonic,
      secure: true,
      unlocked_accounts: [expected_address]
    }));

    web3.vap.sendTransaction({
      from: expected_address,
      to: "0x1234567890123456789012345678901234567890", // doesn't need to exist
      value: web3.toWei(1, "Vapor"),
      gasLimit: 90000
    }, function(err, tx) {
      if (err) return done(err);
      // We should have no error here because the account is unlocked.
      done();
    });
  });

  it("should unlock specified accounts, in conjunction with --secure, using array indexes", function(done) {
    var web3 = new Web3();
    web3.setProvider(TestRPC.provider({
      mnemonic: mnemonic,
      secure: true,
      unlocked_accounts: [0]
    }));

    web3.vap.sendTransaction({
      from: expected_address,
      to: "0x1234567890123456789012345678901234567890", // doesn't need to exist
      value: web3.toWei(1, "Vapor"),
      gasLimit: 90000
    }, function(err, tx) {
      if (err) return done(err);
      // We should have no error here because the account is unlocked.
      done();
    });
  });

  it("should unlock accounts even if private key isn't managed by the testrpc (impersonation)", function(done) {
    var second_address = "0x1234567890123456789012345678901234567890";

    var web3 = new Web3();
    web3.setProvider(TestRPC.provider({
      mnemonic: mnemonic,
      secure: true,
      unlocked_accounts: [0, second_address]
    }));

    // Set up: give second address some vapor
    web3.vap.sendTransaction({
      from: expected_address,
      to: second_address,
      value: web3.toWei(10, "Vapor"),
      gasLimit: 90000
    }, function(err, tx) {
      if (err) return done(err);

      // Now we should be able to send a transaction from second address without issue.
      web3.vap.sendTransaction({
        from: second_address,
        to: expected_address,
        value: web3.toWei(5, "Vapor"),
        gasLimit: 90000
      }, function(err, tx) {
        if (err) return done(err);

        // And for the heck of it let's check the balance just to make sure it went througj
        web3.vap.getBalance(second_address, function(err, balance) {
          if (err) return done(err);

          var balanceInVapor = web3.fromWei(balance, "Vapor");

          // Can't check the balance exactly. It cost some vapor to send the transaction.
          assert(balanceInVapor.gt(4));
          assert(balanceInVapor.lt(5));
          done();
        });
      });
    });
  });

  it("errors when we try to sign a transaction from an account we're impersonating", function(done) {
    var second_address = "0x1234567890123456789012345678901234567890";

    var web3 = new Web3();
    web3.setProvider(TestRPC.provider({
      mnemonic: mnemonic,
      secure: true,
      unlocked_accounts: [0, second_address]
    }));

    web3.vap.sign(second_address, "some data", function(err, result) {
      if (!err) return done(new Error("Expected an error while signing when not managing the private key"));

      assert(err.message.toLowerCase().indexOf("cannot sign data; no private key") >= 0);
      done();
    });
  });


});
