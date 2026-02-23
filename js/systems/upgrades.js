import { game } from '../core/state.js';
import { nextLevel } from '../ui/screens.js';

const UPGRADES=[
  {id:'maxHp',name:'\u751F\u547D\u5F3A\u5316',color:'#ff6688',desc:'\u6700\u5927HP+1 \u5E76\u6062\u590D\u6EE1\u8840',apply(){game.playerMaxHp++;game.playerHp=game.playerMaxHp;},getValue(){return `${game.playerMaxHp} \u2192 ${game.playerMaxHp+1}`;}},
  {id:'shieldCap',name:'\u62A4\u76FE\u5BB9\u91CF',color:'#00ccff',desc:'\u62A4\u76FE\u6700\u5927\u80FD\u91CF+30',apply(){game.shieldMaxEnergy+=30;game.shieldEnergy=game.shieldMaxEnergy;},getValue(){return `${game.shieldMaxEnergy} \u2192 ${game.shieldMaxEnergy+30}`;}},
  {id:'shieldRegen',name:'\u62A4\u76FE\u56DE\u590D',color:'#00eeff',desc:'\u62A4\u76FE\u6062\u590D\u901F\u5EA6+5/s',apply(){game.shieldRegenRate+=5;},getValue(){return `${game.shieldRegenRate}/s \u2192 ${game.shieldRegenRate+5}/s`;}},
  {id:'bonusAmmo',name:'\u5F39\u836F\u8865\u7ED9',color:'#00ff88',desc:'\u7ACB\u5373\u83B7\u5F97+8\u5F39\u836F',apply(){game.shots+=8;},getValue(){return `+8`;}},
  {id:'bulletDmg',name:'\u6FC0\u5149\u5A01\u529B',color:'#ffcc44',desc:'\u5B50\u5F39\u4F24\u5BB3+1',apply(){game.bulletDamage++;},getValue(){return `${game.bulletDamage} \u2192 ${game.bulletDamage+1}`;}}
];

let currentUpgradeChoices=[];

export function showUpgradePanel(){const panel=document.getElementById('upgradePanel');panel.innerHTML='';const shuffled=[...UPGRADES].sort(()=>Math.random()-0.5);currentUpgradeChoices=shuffled.slice(0,3);currentUpgradeChoices.forEach((upg,idx)=>{const card=document.createElement('div');card.className='upgrade-card';card.innerHTML=`<div class="upgrade-name" style="color:${upg.color}">${upg.name}</div><div class="upgrade-value">${upg.getValue()}</div><div class="upgrade-desc">${upg.desc}</div><div class="upgrade-key">${idx+1}</div>`;card.addEventListener('click',()=>applyUpgrade(idx));panel.appendChild(card);});}

export function applyUpgrade(index){if(index<0||index>=currentUpgradeChoices.length)return;currentUpgradeChoices[index].apply();currentUpgradeChoices=[];nextLevel();}
