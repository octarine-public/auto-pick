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

new (class CAutoPick {
	private readonly menu!: MenuManager
	private readonly sleeper = new Sleeper()
	private readonly heroesDisallowed = new Set<number>()

	private get isBanPhase() {
		return GameRules?.IsBanPhase ?? false
	}

	private get gameState() {
		return GameRules?.GameState ?? DOTAGameState.DOTA_GAMERULES_STATE_INIT
	}

	private get isHeroSelection() {
		return this.gameState === DOTAGameState.DOTA_GAMERULES_STATE_HERO_SELECTION
	}

	private get state() {
		return this.menu.State.value
	}

	private get heroSelector() {
		return this.menu.HeroSelected
	}

	private get heroNames() {
		return this.menu.HeroNames
	}

	constructor(canBeInitialized: boolean) {
		if (!canBeInitialized) {
			return
		}
		this.menu = new MenuManager()
		EventsSDK.on("GameEnded", this.GameChanged.bind(this))
		EventsSDK.on("GameStarted", this.GameChanged.bind(this))
		EventsSDK.on("ChatEvent", this.ChatEvent.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("UnitAbilityDataUpdated", this.UnitAbilityDataUpdated.bind(this))
	}

	public PostDataUpdate(_dt: number) {
		if (!GameState.IsConnected || !this.state) {
			return
		}
		if (!this.isHeroSelection || this.isBanPhase) {
			return
		}
		const heroName = this.GetHeroName()
		if (heroName === undefined || this.sleeper.Sleeping("pickHero")) {
			return
		}
		GameState.ExecuteCommand(`dota_select_hero ${heroName}`)
		this.sleeper.Sleep(GameState.InputLag * 1000, "pickHero")
	}

	public ChatEvent(type: DOTA_CHAT_MESSAGE, heroID: number, ..._args: number[]) {
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
		for (let index = this.heroNames.length - 1; index > -1; index--) {
			const name = this.heroNames[index]
			if (!this.heroSelector.IsEnabled(name)) {
				continue
			}
			const heroId = UnitData.GetHeroID(name)
			if (!this.heroesDisallowed.has(heroId)) {
				return name
			}
		}
	}
})(true)
