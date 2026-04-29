import JimBeamModel1 from "./static/models/JimBeam_1.glb";
import JimBeamModel2 from "./static/models/JimBeam_2.glb";
import JimBeamModel3 from "./static/models/JimBeam_3.glb";
import JimBeamModel4 from "./static/models/JimBeam_4.glb";
import JimBeamModel5 from "./static/models/JimBeam_5.glb";
import Roku_1 from "./static/models/Roku_1.glb";
import MakersMark from "./static/models/MakersMark.glb";
import Minus196_1 from "./static/models/Minus196_1.glb";
import Minus196_2 from "./static/models/Minus196_2.glb";

// Bottles
import MakersMarkBottles from "./static/models/MakersMarkBottles_3by2.glb";
import RokuBottles from "./static/models/RokuBottles.glb";
import JimBeamBottles from "./static/models/JIMBEAMBOTTLES1.glb";
import jimeam2 from "./static/models/JimBeam_1.glb";

export const threeModels = [
	{
		id: 1,
		modelName: "Makers Mark",
		modelLink: MakersMark,
		brand: "makersMark",
	},
	{
		id: 2,
		modelName: "Roku",
		modelLink: Roku_1,
		brand: "roku",
	},

	{
		id: 3,
		modelName: "Jim Beam",
		modelLink: JimBeamModel1,
		brand: "jimbeam",
	},
	{
		id: 4,
		modelName: "Suntory Minus 196",
		modelLink: Minus196_1,
		brand: "minus196",
	},
	// {
	// 	id: 5,
	// 	modelName: ">>>",
	// 	modelLink: jimeam2,
	// 	brand: "minus196",
	// },
];

export const bottles = [
	{
		brand: "makersMark",
		modelLink: MakersMarkBottles,
	},
	{
		brand: "roku",
		modelLink: RokuBottles,
	},
	{
		brand: "jimbeam",
		modelLink: JimBeamBottles,
	},
	{
		brand: "minus196",
		modelLink: null,
	},
];
