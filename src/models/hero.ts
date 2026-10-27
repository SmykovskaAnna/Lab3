export type HeroClass = 'Warrior' | 'Paladin' | 'Sorcerer';

export type HeroStats = {
  strength: number;
  stamina: number;
  agility: number;
  magic: number;
};

export class Hero {
  name: string;
  heroClass: HeroClass;
  stats: HeroStats;

  constructor(name = '', heroClass: HeroClass = 'Warrior', stats?: HeroStats) {
    this.name = name;
    this.heroClass = heroClass;
    this.stats = stats ? { ...stats } : { strength: 1, stamina: 1, agility: 1, magic: 1 };
  }

  clone(): Hero {
    return new Hero(this.name, this.heroClass, this.stats);
  }

  getTotalPoints(): number {
    return this.stats.strength + this.stats.stamina + this.stats.agility + this.stats.magic;
  }
}
