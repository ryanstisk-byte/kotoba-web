// Shopkeeper (ShopkeeperView.swift): listen to orders, count out the right number with the right counter, answer politely.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { SHOP_STOCK, COUNTERS, CUSTOMERS, SHOP_GREETINGS, SHOP_THANKS } from '../data.js';
import { esc, pick, delegate } from '../ui.js';
import * as fx from '../fx.js';

export function mount(el, ctx) {
  const GOAL = 3;
  let customer = CUSTOMERS.worker;
  let item = SHOP_STOCK[0];
  let count = 1;
  let step = 'greet';
  let basket = [];
  let showText = false;
  let feedback = null;
  let served = 0;
  let perfect = 0;
  let mistakes = 0;
  let orderTimer;

  // A course unit can limit orders to its counters (ctx.counters); the shelf and scoring stay the same.
  const orderStock = ctx.counters?.length ? SHOP_STOCK.filter((s) => ctx.counters.includes(s.counter)) : SHOP_STOCK;
  const say = (it, n) => COUNTERS[it.counter].say[n - 1];
  const orderText = () => customer.order(item, say(item, count));
  const sayOrder = () => speaker.speak(orderText(), { mps: 4, voice: customer.voice });

  function render() {
    el.innerHTML = `
      <div class="stack">
        <p class="strong mono" lang="ja">お店 · ${served} served · ${perfect} perfect</p>
        <div class="panel customer">
          <span class="cust-emoji">${customer.emoji}</span>
          <div class="grow">
            <p class="small dim">${esc(customer.label)}</p>
            ${step === 'greet' ? '<p class="lead">(walks in)</p>' : `
              <p class="lead strong" lang="ja">${showText || step === 'done' ? esc(orderText()) : '🔊 Listen to the order'}</p>
              <div class="row-gap">
                <button class="linkbtn" data-act="hear">Hear again</button>
                <button class="linkbtn" data-act="text">${showText ? 'Hide text' : 'Show text'}</button>
              </div>`}
          </div>
        </div>
        ${feedback ? `<p class="${feedback.startsWith('✓') ? 'good-c' : 'miss-c'}" lang="ja">${esc(feedback)}</p>` : ''}
        ${body()}
      </div>`;
  }

  function body() {
    if (step === 'greet') {
      return `<p class="small strong dim">A customer walks in. What do you say?</p>
        ${SHOP_GREETINGS.map((g, i) => `<button class="btn left" data-act="greet" data-i="${i}" lang="ja">${esc(g)}</button>`).join('')}`;
    }
    if (step === 'fill') {
      return `<p class="small strong dim">Put the order on the counter, then hand it over.</p>
        <div class="shop-grid">${SHOP_STOCK.map((s, i) => `
          <button class="panel shop-item" data-act="add" data-i="${i}"><span class="shop-emoji">${s.emoji}</span><span class="small strong" lang="ja">${esc(s.name)}</span></button>`).join('')}
        </div>
        <div class="panel counter-row"><span class="counter-items">${basket.length ? basket.map((b) => b.emoji).join(' ') : '<span class="dim">Counter is empty</span>'}</span>
          ${basket.length ? '<button class="linkbtn" data-act="clear">Clear</button>' : ''}</div>
        <button class="btn primary wide" data-act="hand" ${basket.length ? '' : 'disabled'}>✋ Hand it over</button>`;
    }
    if (step === 'reply') {
      return `<p class="small strong dim">They're leaving. What does a shopkeeper say?</p>
        ${SHOP_THANKS.map((t, i) => `<button class="btn left" data-act="reply" data-i="${i}" lang="ja">${esc(t)}</button>`).join('')}`;
    }
    const c = COUNTERS[item.counter];
    return `<div class="panel stack-sm">
        <p class="strong" lang="ja">${item.emoji} ${esc(item.name)} (${esc(item.en)}) × ${count} = ${esc(say(item, count))}</p>
        <p class="small dim">${esc(c.explanation)}</p>
        <p class="small dim">${esc(customer.styleNote)}</p>
      </div>
      <button class="btn primary wide" data-act="nextc">🧑 Next customer</button>`;
  }

  function greet(i) {
    const g = SHOP_GREETINGS[i];
    if (i === 0) {
      feedback = '✓ いらっしゃいませ is what every shop says to welcome customers.';
      if (!mistakes) store.log(true);
      store.grade({ skill: 'grammar', id: 'shop:greet', ok: true, firstTry: !mistakes });
      speaker.speak(g, { mps: 4.5, voice: 1 });
      step = 'fill';
      clearTimeout(orderTimer);
      orderTimer = setTimeout(sayOrder, 1400);
    } else {
      if (!mistakes) store.log(false);
      store.grade({ skill: 'grammar', id: 'shop:greet', ok: false, firstTry: !mistakes });
      mistakes++;
      feedback = `That's not a shop greeting. ${i === 1 ? 'おかえりなさい is "welcome home".' : 'いただきます is said before eating.'} Try again.`;
    }
    render();
    if (i === 0) fx.hit(); else fx.miss();
  }

  function handOver() {
    const right = basket.length === count && basket.every((b) => b === item);
    if (right) {
      feedback = `✓ Right: ${say(item, count)} ${item.name}.`;
      store.log(true);
      store.grade({ skill: 'counters', id: `${item.counter}:${count}`, ok: true, firstTry: !mistakes });
      if (!showText) store.grade({ skill: 'listening', id: `order:${item.name}`, ok: true, firstTry: !mistakes });
      step = 'reply';
    } else {
      store.log(false);
      store.grade({ skill: 'counters', id: `${item.counter}:${count}`, ok: false, firstTry: !mistakes });
      if (!showText) store.grade({ skill: 'listening', id: `order:${item.name}`, ok: false, firstTry: !mistakes });
      mistakes++;
      feedback = `Hmm, they wanted ${item.name} × ${count} (${say(item, count)}). Listen again and fix the counter.`;
      basket = [];
      showText = true;
    }
    render();
    if (right) fx.hit(); else fx.miss();
  }

  function reply(i) {
    const t = SHOP_THANKS[i];
    if (i === 0) {
      feedback = '✓ ありがとうございました: the polite past-tense thanks shops use as customers leave.';
      speaker.speak(t, { mps: 4.5, voice: 1 });
      store.log(true);
      store.grade({ skill: 'grammar', id: 'shop:thanks', ok: true, firstTry: !mistakes });
      served++;
      if (mistakes === 0) perfect++;
      step = 'done';
      if (ctx.today) {
        ctx.today.report(`${Math.min(served, GOAL)}/${GOAL}`);
        if (served >= GOAL) ctx.today.done();
      }
    } else {
      store.log(false);
      store.grade({ skill: 'grammar', id: 'shop:thanks', ok: false, firstTry: !mistakes });
      mistakes++;
      feedback = i === 1
        ? 'じゃあね is a casual "see ya". Too casual for a shopkeeper with any customer.'
        : 'どういたしまして means "you\'re welcome". Here the shop should be thanking them.';
    }
    render();
    if (i === 0) fx.hit({ big: true }); else fx.miss();
  }

  function nextCustomer() {
    customer = pick(Object.values(CUSTOMERS));
    item = pick(orderStock.length ? orderStock : SHOP_STOCK);
    count = 1 + Math.floor(Math.random() * 5);
    basket = [];
    feedback = null;
    mistakes = 0;
    // Start with text visible for the first few customers, then switch to listening only.
    showText = served < 3;
    step = 'greet';
    render();
  }

  const off = delegate(el, {
    hear: sayOrder,
    text: () => { showText = !showText; render(); },
    greet: (b) => greet(+b.dataset.i),
    add: (b) => { if (basket.length < 5) { basket.push(SHOP_STOCK[+b.dataset.i]); render(); } },
    clear: () => { basket = []; render(); },
    hand: handOver,
    reply: (b) => reply(+b.dataset.i),
    nextc: nextCustomer,
  });

  store.markSession();
  if (ctx.today) ctx.today.report(`0/${GOAL}`);
  nextCustomer();
  return () => { off(); clearTimeout(orderTimer); speaker.stop(); };
}
