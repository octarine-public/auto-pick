import { AutoPickIcons } from "./icons"

/** The primary attributes in the order the game numbers them, each heading its heroes. */
const AttributeNames = ["Strength", "Agility", "Intellect", "Universal"]

export class MenuManager {
	public HeroNames: string[] = []
	public readonly State: Menu.Toggle
	public readonly HeroSelected: Menu.ImageSelector

	private readonly tree: Menu.Node

	constructor() {
		this.tree = Menu.AddEntry("Utility").AddNode(
			"Auto pick",
			AutoPickIcons.Page,
			"Picks the first of your heroes\nthat is still free once picking opens"
		)
		this.tree.SortNodes = false
		// the picker was named "Hero" before the page was rebuilt; its chosen heroes carry over
		this.migrate(this.tree.entry.stored)
		MenuSDK.AddConfigMigration(raw =>
			this.migrate(MenuSDK.ConfigSubtreeOf(raw, this.tree.entry))
		)

		// the script's own switch rides the header of the page and gates it
		this.State = this.tree.AddToggle("State")
		this.State.IconPath = AutoPickIcons.State
		this.tree.HeaderControl = this.State
		this.tree.Gate = this.State

		this.HeroSelected = this.tree.AddImageSelector(
			"Heroes",
			[],
			[],
			"Heroes to pick, the first one free goes.\nPress + to choose them, drag to reorder"
		)
		this.HeroSelected.IconPath = AutoPickIcons.Heroes
		this.HeroSelected.Variant = "hero"
		this.HeroSelected.Draggable = true
		this.UnitDataUpdated()
	}

	/** The chosen heroes in the order they stand in the picker, the first one first. */
	public get ChosenHeroes(): string[] {
		const picker = this.HeroSelected
		return this.HeroNames.filter(name => picker.IsEnabled(name)).sort(
			(a, b) => picker.GetPriority(a) - picker.GetPriority(b)
		)
	}

	/**
	 * Lists every hero the game data knows, and hands the picker its catalogue: the heroes of
	 * each primary attribute under its heading. The data arrives with the server, so nothing
	 * is handed over before it does.
	 */
	public UnitDataUpdated() {
		const heroes = [...UnitData.globalStorage.entries()].filter(([name, data]) =>
			this.isHero(name, data)
		)
		this.HeroNames = heroes.map(([name]) => name)
		const catalogue = AttributeNames.map((title, attribute) => ({
			title,
			values: heroes
				.filter(([, data]) => data.AttributePrimary === attribute)
				.map(([name]) => name)
				.sort((a, b) => a.localeCompare(b))
				.map(name => ({ value: name, label: name }))
		})).filter(section => section.values.length !== 0)
		if (catalogue.length !== 0) {
			this.HeroSelected.Catalogue = catalogue
		}
	}

	private isHero(name: string, data: UnitData) {
		return (
			data.HeroID !== 0 &&
			name !== "npc_dota_hero_base" &&
			name !== "npc_dota_hero_target_dummy" &&
			name.startsWith("npc_dota_hero_")
		)
	}

	private migrate(stored: Nullable<MenuSDK.ConfigObject>) {
		MenuSDK.RenameStoredRow(stored, "Hero", "Heroes")
	}
}
