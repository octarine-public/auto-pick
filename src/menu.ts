import { ImageData, Menu, UnitData } from "github.com/octarine-public/wrapper/index"

export class MenuManager {
	public HeroNames: string[] = []
	public readonly State: Menu.Toggle
	public readonly HeroSelected: Menu.ImageSelector

	private readonly tree: Menu.Node
	private readonly heroAttribute: Menu.Dropdown
	private readonly baseNode = Menu.AddEntry("Utility")
	private readonly attrNames = ["Strength", "Agility", "Intellect", "Universal"]

	constructor() {
		this.tree = this.baseNode.AddNode("Auto pick", ImageData.Icons.magic_resist)
		this.State = this.tree.AddToggle("State")
		this.heroAttribute = this.tree.AddDropdown(
			"Primary attribute hero",
			this.attrNames
		)
		this.HeroSelected = this.tree.AddImageSelector("Hero", [])
		this.heroAttribute.OnValue(call =>
			this.UpdateHeroSelectedNodes(call, this.HeroSelected)
		)
	}

	private get getArrStoreData() {
		return [...UnitData.globalStorage.entries()]
	}

	public UnitAbilityDataUpdated() {
		this.HeroNames = this.getArrStoreData
			.filter(([name, data]) => this.IsValidName(name, data))
			.map(([name]) => name)
	}

	protected UpdateHeroSelectedNodes(
		attribute: Menu.Dropdown,
		imageSelector: Menu.ImageSelector
	) {
		this.HeroNames = this.getArrStoreData
			.filter(([name, data]) => this.IsValidName(name, data))
			.map(([name]) => name)

		const heroes = this.getArrStoreData
			.filter(
				([name, data]) =>
					this.IsValidName(name, data) &&
					data.AttributePrimary === attribute.SelectedID
			)
			.map(([name]) => name)
			.sort((a, b) => a.localeCompare(b))

		imageSelector.values = heroes
		imageSelector.Update()
		this.tree.Update()
	}

	protected IsValidName(name: string, data: UnitData) {
		return (
			data.HeroID !== 0 &&
			name !== "npc_dota_hero_base" &&
			name !== "npc_dota_hero_target_dummy" &&
			name.startsWith("npc_dota_hero_")
		)
	}
}
