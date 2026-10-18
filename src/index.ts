import "./translations"

import { MenuManager } from "./menu"

new (class CAutoPick {
	private readonly menu!: MenuManager
	private readonly sleeper = new Sleeper()
	private readonly heroesDisallowed = new Set<number>()

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

	private get isHeroSelection() {
		return (
			GameRules !== undefined &&
			!GameRules.IsBanPhase &&
			GameRules.GameState === DOTAGameState.DOTA_GAMERULES_STATE_HERO_SELECTION
		)
	}

	/** Whether the local player has a hero locked in already. */
	private get hasPicked() {
		const player = PlayerCustomData.Array.find(data => data.IsLocalPlayer)
		return player === undefined || player.IsSpectator || player.SelectedHeroID > 0
	}

	public PostDataUpdate(_dt: number) {
		if (!GameState.IsConnected || !this.menu.State.value) {
			return
		}
		if (!this.isHeroSelection || this.hasPicked) {
			return
		}
		if (this.sleeper.Sleeping("pickHero")) {
			return
		}
		this.updateBannedHeroes()
		const heroName = this.GetHeroName()
		if (heroName === undefined) {
			return
		}
		GameState.ExecuteCommand(`dota_select_hero ${heroName}`)
		this.sleeper.Sleep(GameState.InputLag * 1000, "pickHero")
	}

	public ChatEvent(type: DOTA_CHAT_MESSAGE, heroID: number, ..._args: number[]) {
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
		this.menu.UnitDataUpdated()
	}

	/** The first chosen hero, in the picker's order, that is neither banned nor taken. */
	protected GetHeroName() {
		return this.menu.ChosenHeroes.find(
			name => !this.heroesDisallowed.has(UnitData.GetHeroID(name))
		)
	}

	private updateBannedHeroes() {
		const banned = GameRules?.BannedHeroesIDs ?? []
		for (let index = banned.length - 1; index > -1; index--) {
			this.heroesDisallowed.add(banned[index])
		}
	}
})(true)
