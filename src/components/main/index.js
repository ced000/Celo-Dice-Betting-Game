import React, { useEffect, useState } from "react";
import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import "./styles.css";
import Die from "../Die/die";
import DiceBettingGame from "../../contracts/abis/DiceBettingGame.abi.json";
import erc20Abi from "../../contracts/abis/erc20.abi.json";
import FadeLoader from "react-spinners/FadeLoader";
import { css } from "@emotion/react";

const DiceGame = ({ sides }) => {
  // loader css
  const override = css`
    display: block;
    margin: auto;
    /* border-color: red; */
  `;

  // states
  const [kit, setKit] = useState();
  const [dBGContract, setDGBContract] = useState();
  const [cUSDContract, setCUSDContract] = useState();

  const [prediction, setPrediction] = useState(1); //your prediction
  const [cUSDStake, setCUSDStake] = useState(0.5);
  const [cUSDBalance, setCUSDBalance] = useState();
  const [notification, setNotification] = useState();
  const [dieState, setDieState] = useState({
    die: "six",
    rolling: false,
    side: 6,
  });

  useEffect(() => {
    async function InitWalletAndBalance() {
      // initialize wallet details
      displayNotification("⌛ Loading...");
      await connectCeloWallet();
      await getBalance();
    }
    InitWalletAndBalance();
  }, [cUSDBalance]);

  // constants
  const ERC20_DECIMALS = 18;
  const DBGContractAddress = "0x1d42a9325b61384d73F8b5E1b205f0dD47A45F79";
  const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

  const { die, rolling, side } = dieState;
  const displayNotification = (_text) => {
    setNotification(_text);
  };
  const notificationOff = (_text) => {
    setNotification();
  };

  const rollDie = async () => {
    // stake has to be greater than 0 usd
    if (!(cUSDStake > 0)) {
      return displayNotification("⚠️ Invalid Stake amount");
    }
    // prediction is between 1 and 6
    if (prediction <= 0 || prediction > 6) {
      return displayNotification("⚠️ Guess Range is from 1 ~ 6");
    }
    displayNotification("⌛ Waiting for payment approval...");
    try {
      setDieState((prevState) => ({ ...prevState, rolling: true }));

      // approve transaction first
      await approve(cUSDStake);
      displayNotification(
        `⌛ Awaiting payment for your ${cUSDStake} cUSD Stake`
      );

      setDieState((prevState) => ({ ...prevState, rolling: true }));

      // play game
      await dBGContract.methods
        .playGame(
          prediction,
          new BigNumber(cUSDStake).shiftedBy(ERC20_DECIMALS).toString()
        )
        .send({ from: kit.defaultAccount });

      // fetch new balance
      getBalance();
    } catch (error) {
      displayNotification(`⚠️ ${error}.`);
    }
    setDieState((prevState) => ({ ...prevState, rolling: false }));
  };

  const approve = async (amount) => {
    //  allow contract to spend amount cusd
    const result = await cUSDContract.methods
      .approve(
        DBGContractAddress,
        new BigNumber(amount).shiftedBy(ERC20_DECIMALS).toString()
      )
      .send({ from: kit.defaultAccount });
    return result;
  };

  const connectCeloWallet = async function () {
    if (window.celo) {
      displayNotification("⚠️ Please approve this DApp to use it.");
      try {
        await window.celo.enable();
        notificationOff();

        const web3 = new Web3(window.celo);
        let mKit = newKitFromWeb3(web3);

        const accounts = await mKit.web3.eth.getAccounts();
        mKit.defaultAccount = accounts[0];
        setKit(mKit);

        // set Dice game contract
        let contract = new kit.web3.eth.Contract(
          DiceBettingGame,
          DBGContractAddress
        );

        setDGBContract(contract);
        // Listen for the Game Event
        contract.once(
          "Game",
          {},
          {
            fromBlock: 6523028,
            toBlock: "latest",
          },
          function (error, event) {
            // update dice values
            const newDie = sides[parseInt(event.returnValues.dieRollValue)];
            const score = Object.values(newDie);
            setDieState({
              die: Object.keys(newDie),
              rolling: false,
              side: score[0],
            });

            // display notification
            if (
              event.returnValues.userGuess === event.returnValues.dieRollValue
            ) {
              displayNotification(
                `🎉 You got it right!!! you have won ${cUSDStake * 2} cUSD.`
              );
            } else {
              displayNotification(
                `⚠️ oops! you got it wrong!!! you lost ${cUSDStake} cUSD.`
              );
            }
          }
        );

        // set cusd contract
        setCUSDContract(
          new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)
        );
        // set celo kit
      } catch (error) {
        displayNotification(`⚠️ ${error}.`);
      }
    } else {
      displayNotification("⚠️ Please install the CeloExtensionWallet.");
    }
  };
  
  const getBalance = async function () {
    displayNotification("⌛ Loading...");
    await window.celo.enable();

    const web3 = new Web3(window.celo);
    let mKit = newKitFromWeb3(web3);
    const accounts = await mKit.web3.eth.getAccounts();

    const totalBalance = await mKit.getTotalBalance(accounts[0]);
    const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
    setCUSDBalance(cUSDBalance);
    notificationOff();
  };

  return (
    <div className="hero">
      <div className="container mt-2">
        <nav className="navbar bg-white navbar-light">
          <div className="container-fluid">
            <span className="navbar-brand m-0 h4 fw-bold">
              Dice Betting Game
            </span>
            <span className="nav-link border rounded-pill bg-light text-dark">
              <span id="balance">{`${cUSDBalance ?? 0} `}</span>
              cUSD
            </span>
          </div>
        </nav>
        {notification && (
          <div className="alert alert-warning sticky-top mt-2" role="alert">
            <span id="notification">{notification}</span>
          </div>
        )}
        {/* Only show main game component when balance is successfuly fetched */}
        {cUSDBalance ? (
          <div className="container">
            <div className="randomNum">
              <p>
                Dice Roll Output: <span>{side}</span>
              </p>
            </div>
            {rolling ? (
              <FadeLoader
                color="green"
                loading={true}
                className="loader"
                css={override}
                size={150}
              />
            ) : (
              <Die face={String(die)} rolling={rolling} />
            )}
            <div className="numContainer">
              <div>
                <p>Your Prediction:</p>
                <input
                  type="number"
                  value={prediction}
                  onChange={(e) => setPrediction(+e.target.value)}
                />
              </div>
              <div>
                <p>cUSD stake:</p>
                <input
                  type="number"
                  value={cUSDStake}
                  onChange={(e) => setCUSDStake(+e.target.value)}
                />
              </div>
            </div>
            <button onClick={rollDie} disabled={rolling}>
              {rolling ? "..." : "Place Bet "}
            </button>
          </div>
        ) : (
          <div></div>
        )}{" "}
      </div>
    </div>
  );
};

DiceGame.defaultProps = {
  sides: [
    { one: 1 },
    { two: 2 },
    { three: 3 },
    { four: 4 },
    { five: 5 },
    { six: 6 },
  ],
};

export default DiceGame;
