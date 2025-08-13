// src/utils/math.js

/**
 * 执行一个基于属性的成功判定。
 * @param {string} attribute 参与判定的主要属性名称。
 * @param {number} value 判定所需的属性值阈值。
 * @param {object} playerAttributes 玩家当前所有属性。
 * @returns {boolean} 判定是否成功。
 */
export function performCheck(attribute, value, playerAttributes) {
    const baseValue = playerAttributes[attribute] || 0;
    const isSuccess = (baseValue + Math.random() * 20) > value;
    return isSuccess;
}

/**
 * 计算战斗伤害。
 * @param {object} attacker 攻击方。
 * @param {object} defender 防御方。
 * @returns {number} 造成的伤害值。
 */
export function calculateCombatDamage(attacker, defender) {
    const attackValue = attacker.strength || attacker.attack || 0;
    const defenseValue = defender.defense || 0;
    const damage = Math.max(0, attackValue - defenseValue + Math.floor(Math.random() * 10));
    return damage;
}