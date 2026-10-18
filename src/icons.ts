import { Paths } from "./paths"

/** Glyphs of the menu page: the SDK set where it has one, our own outline glyphs otherwise. */
export const AutoPickIcons = {
	/** A figure with a check beside it: the hero locked in for you. */
	Page: `${Paths.Icons}/auto-pick.svg`,
	State: Menu.Icons.Power,
	Heroes: Menu.Icons.IconJuggernaut
} as const
