import React from 'react'

import { observer, inject } from 'mobx-react';
import classNames from 'classnames';
import QRCode from 'qrcode.react';


import { CoinPicker, Clipboard } from '../';

import * as Icon from 'react-cryptocoins';
import zoro from '../../static/zoro.svg';
import shuffle from '../../static/shuffle.svg';
import arrow from '../../static/arrow.svg';
import sell from '../../static/sell.svg';
import buy from '../../static/buy.svg';
import circles from '../../static/circles.svg';


const formatNumber = (str) => str;


@inject('app')
@observer
class Trade extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            privateTransaction: false,
            amountRel: 0,
            amountBase: 0,
            autoMax: false,
            picker: false,
            flow: 'buy',
            showOrderbook: false,
            validation: `enter amount to continue`

        }
    }

    getClassState = () => {
        const self = this;
        return classNames({
            'trade-action': true,
            'trade-action-max': this.state.autoMax
        })
    }


    componentDidMount = () => {
        const self = this;
        self.resetForm();
    }

    togglePrivate = () => {
        this.setState({ privateTransaction: !this.state.privateTransaction })
    }

    getRate = () => {
        const { asks } = this.props.app.orderbook;
        if (asks.length > 0) {
            return asks[0].price;
        }

        return 0;
    }

    toggleOrderbook = (e) => {
        this.setState({ showOrderbook: !this.state.showOrderbook });
        e.stopPropagation()
    }

    resetForm = () => {
        // this.amountRelInput.focus();
        // this.amountRelInput.value = '';
        const { tradeRel, tradeBase } = this.props.app.portfolio;
        this.setState({ amountRel: 0, amountBase: 0, picker: false })
        this.validation({});
    }


    componentWillReact = () => {
        this.validation({ amountRel: this.state.amountRel, rate: this.props.app.portfolio.rates.ask });
    }

    trade = () => {
        const { tradeRel, tradeBase } = this.props.app.portfolio;
        const { trade } = this.props.app.trade;

        const params = {
            method: 'bot_buy',
            base: tradeBase.coin,
            rel: tradeRel.coin,
            price: this.props.app.portfolio.rates.ask,
            volume: this.state.amountRel * this.props.app.portfolio.rates.ask,
            smartaddress: tradeRel.smartaddress
        };

        trade(params);

        this.resetForm();
    }

    validation = ({ amountRel, rate }) => {
        let validation = false;
        const { tradeRel } = this.props.app.portfolio;


        const amount = amountRel != null ? amountRel : this.state.amountRel;
        const price = rate != null ? rate : this.props.app.portfolio.rates.ask;

        if (!price) {
            validation = `price is empty`;
        } else if ((tradeRel.balance / price) < amount) {
            validation = (<div className="validation"><span>not enough {tradeRel.coin}</span><small>(max {tradeRel.balance})</small></div>);
        } else if (!amount) {
            validation = `${tradeRel.coin} amount is empty`;
        }

        this.setState({ validation });
    }


    setMax = () => {
        const { tradeRel } = this.props.app.portfolio;
        const params = {
            target: {
                validity: { valid: true },
                value: tradeRel.balance / this.props.app.portfolio.rates.ask
            }
        }
        this.updateAmountRel(params);
    }

    updateRate = (e) => {
        if (e.target.validity.valid) {
            const { updateRate } = this.props.app.portfolio;

            const rate = e.target.value;
            const parsed = formatNumber(rate);
            updateRate({ price: parsed, type: 'ask' });

            this.validation({ rate: parsed });

            this.state.autoMax && setTimeout(() => this.setMax())
        }
    }

    updateAmountRel = (e) => {
        if (e.target.validity.valid) {
            const amountRel = e.target.value;
            const parsed = formatNumber(amountRel);
            const { tradeRel } = this.props.app.portfolio;

            if (amountRel * this.props.app.portfolio.rates.ask === tradeRel.balance) {
                this.setState({ autoMax: true })
            } else {
                this.setState({ autoMax: false })
            }


            this.setState({ amountRel: parsed });
            this.validation({ amountRel: parsed });
        }
    }

    tradeWith = (e, coin) => {
        const { setTrade } = this.props.app.portfolio;
        setTrade(coin, 'Rel');
        // autoclose after selection
        this.props.onClose && this.props.onClose();
    }


    closeSelects = () => { this.setState({ picker: false, showOrderbook: false }) }


    renderPrice = () => (

      <section className="trade-amount_input_price">
        <span className="label">
          <strong className="label-title">Max Price</strong>
          <small>
            <button className="link" onClick={(e) => this.toggleOrderbook(e)}>ask</button>
            <button className="link" onClick={(e) => this.toggleOrderbook(e)}>bid</button>
          </small>
        </span>
        <div className="trade-amount_input-wrapper">
          <input
            name="form-price"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            style={{ fontSize: 18 }}
            value={this.props.app.portfolio.rates.ask}
            onChange={(e) => this.updateRate(e)}
          />
          <CoinPicker onSelected={(e, coin) => this.tradeWith(e, coin)} trade />
        </div>
      </section>

        )


    renderAmount = () => {
        const { tradeRel } = this.props.app.portfolio;
        return (
          <section className="trade-amount_input_amount">
            <span className="label">
              <strong className="label-title">Max Amount</strong>
            </span>
            <div className="trade-amount_input-wrapper">
              <input
                name="form-amount"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                style={{ fontSize: 18 }}
                value={this.state.amountRel}
                onChange={(e) => this.updateAmountRel(e)}
              />
              { tradeRel.balance > 0 && this.props.app.portfolio.rates.ask > 0 && <button className="trade-setMax" onClick={() => this.setMax()}>Max</button> }
            </div>

          </section>
        )
    }


    renderButton = () => {
        const { loader } = this.props.app;
        const orderLoader = loader.getLoader(5);
        const { tradeBase, tradeRel } = this.props.app.portfolio;
        return (
          <section className={`trade-button-wrapper ${tradeBase.coin}`}>
            <button className="trade-button withBorder action primary coin-bg" disabled={orderLoader} onClick={() => this.trade()} disabled={this.state.validation}>
              <div className="trade-action-amountRel">
                <small className="trade-action-amountRel-title"> { this.state.validation ? 'VALIDATION' : 'BUY' }</small>
                { this.state.validation ? this.state.validation : <span>{this.state.amountRel} {tradeBase.coin}</span> }
                { this.state.validation ? '' : <small>(for {this.state.amountRel * this.props.app.portfolio.rates.ask } {tradeRel.coin})</small> }
              </div>
              <i dangerouslySetInnerHTML={{ __html: shuffle }} />
            </button>
          </section>
        )
    }

    renderDeposit = () => {
        const { tradeRel } = this.props.app.portfolio;
        console.log(this.state.amountRel * this.props.app.portfolio.rates.ask)
        return (
          <section className="trade-deposit">
            <div className={`trade-deposit-body`}>
              <section className="trade-deposit-amount">
                <section className={`trade-deposit-amount-left ${tradeRel.coin}`}><p>
                  <span>Awaiting {tradeRel.name} deposit</span>
                </p>
                  <p className="coin-colorized">
                    <strong>{ (this.state.amountRel * this.props.app.portfolio.rates.ask) - tradeRel.balance } { tradeRel.coin }</strong>
                    <i>{tradeRel.icon}</i>
                  </p>
                  <p className="trade-deposit-amount-left-balance"><small>current balance <br /> {tradeRel.balance} {tradeRel.coin} </small></p>
                </section>
                <QRCode size={88} value={tradeRel.smartaddress} />
              </section>
              <section className="trade-deposit-address">
                <Clipboard copyLabel={tradeRel.smartaddress} value={tradeRel.smartaddress} />
              </section>

            </div>
          </section>
        )
    }

    renderLoader = () => {
        const { loader } = this.props.app;
        const orderLoader = loader.getLoader(5);
        const utxosLoader = loader.getLoader(7);

        return (<div className="trade-processing">
          <i className="loader-svg" dangerouslySetInnerHTML={{ __html: circles }} />
          { orderLoader && !utxosLoader && <h3>PROCESSING YOUR ORDER</h3> }
          { utxosLoader && <h3>AUTO SPLITING BALANCE INTO UTXOS</h3> }
        </div>)
    }

    render() {
        // portfolio
        const { loader } = this.props.app;
        const orderLoader = loader.getLoader(5);
        const { tradeBase, tradeRel } = this.props.app.portfolio;

        let action = null;

        if (!orderLoader) {
            action = tradeRel.balance >= (this.state.amountRel * this.props.app.portfolio.rates.ask) ? this.renderButton() : this.renderDeposit()
        }

        console.log(this.props.app.portfolio.rates.ask)


        return (
          <section className={this.getClassState()}>
            { orderLoader ? this.renderLoader() :
            <section className="trade-action-wrapper">
              <div className="trade-amount">
                <section className="trade-amount_input">
                  { this.renderPrice(tradeBase, tradeRel) }
                  { this.renderAmount() }
                </section>
              </div>
            </section> }

            { action }

          </section>
        );
    }
}


export default Trade
