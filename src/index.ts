import "./translations"

import {
	DOTA_CHAT_MESSAGE,
	DOTAGameState,
	EventsSDK,
	GameRules,
	GameState,
	Sleeper,
	UnitData
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"

const bootstrap = new (class CAutoPick {
	private readonly sleeper = new Sleeper()
	private readonly menu = new MenuManager(this.sleeper)
	private readonly heroesDisallowed = new Set<number>()

	protected get IsBanPhase() {
		return GameRules?.IsBanPhase ?? false
	}

	protected get GameState() {
		return GameRules?.GameState ?? DOTAGameState.DOTA_GAMERULES_STATE_INIT
	}

	protected get IsHeroSelection() {
		return this.GameState === DOTAGameState.DOTA_GAMERULES_STATE_HERO_SELECTION
	}

	public PostDataUpdate() {
		if (!GameState.IsConnected || !this.menu.State.value) {
			return
		}
		if (!this.IsHeroSelection || this.IsBanPhase) {
			return
		}
		const heroName = this.GetHeroName()
		if (heroName === undefined || this.sleeper.Sleeping("pickHero")) {
			return
		}
		GameState.ExecuteCommand(`dota_select_hero ${heroName}`)
		this.sleeper.Sleep(3 * 10, "pickHero")
	}

	public OnChatEvent(type: DOTA_CHAT_MESSAGE, heroID: number) {
		if (this.heroesDisallowed.has(heroID)) {
			return
		}
		switch (type) {
			case DOTA_CHAT_MESSAGE.CHAT_MESSAGE_HERO_BANNED:
			case DOTA_CHAT_MESSAGE.CHAT_MESSAGE_HERO_CHOICE_INVALID:
				this.heroesDisallowed.add(heroID)
				break
		}
	}

	public GameChanged() {
		this.sleeper.FullReset()
		this.heroesDisallowed.clear()
	}

	public UnitAbilityDataUpdated() {
		this.menu.UnitAbilityDataUpdated()
	}

	protected GetHeroName() {
		for (let index = this.menu.HeroNames.length - 1; index > -1; index--) {
			const name = this.menu.HeroNames[index]
			if (!this.menu.HeroSelected.IsEnabled(name)) {
				continue
			}
			const heroId = UnitData.GetHeroID(name)
			if (!this.heroesDisallowed.has(heroId)) {
				return name
			}
		}
	}
})()

EventsSDK.on("GameEnded", () => bootstrap.GameChanged())

EventsSDK.on("GameStarted", () => bootstrap.GameChanged())

EventsSDK.on("PostDataUpdate", () => bootstrap.PostDataUpdate())

EventsSDK.on("UnitAbilityDataUpdated", () => bootstrap.UnitAbilityDataUpdated())
