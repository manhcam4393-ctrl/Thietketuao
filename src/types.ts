export interface CabinetBlock {
  id: string;
  type: string;
  start: number;
  end: number;
  widthChar: number;
  widthMm: number;
  heightMm?: number;
  yOffsetMm?: number;
  label?: string;
  text1: string;
  text2: string;
  functionType: string;
  numWings?: number;
}

export interface FurnitureAnalysisData {
  totalChars: number;
  upperBlocks: CabinetBlock[];
  lowerBlocks: CabinetBlock[];
}

export interface AppState {
  activeTab: 'design' | 'render';
  renderMode: 'wardrobe' | 'interior';
  originalImage: string | null;
  cabinetDoor: string;
  referenceImage: string | null;
  handles: string;
  floor: string;
  wall: string;
  ceilingLight: string;
  decor: string;
  style: string;
  lighting: string;
  exposure: string;
  cameraAngle: string;
  renderQuality: string;
  notes: string;
  companyLogo: string | null;
  logoType: 'default' | 'custom' | 'none';
  projectName: string;
  frameStyle: string;
  realisticMaterials: boolean;
  renderIncludeCabinetDoors: boolean;
  lowerCabinetColor: string;
  upperCabinetColor: string;
  lowerCabinetImage: string | null;
  upperCabinetImage: string | null;
  renderIncludeUpperCabinets: boolean;
  renderIncludeLowerCabinets: boolean;
  roomType: string;
  mainFurnitureMaterial: string;
  furnitureColor: string;
  sofaOrBedMaterial: string;
  // Wardrobe Design
  wardrobeLength: string;
  wardrobeHeight: string;
  wardrobeDepth: string;
  wardrobeNumWings: string;
  wardrobeHasTopBlock: boolean;
  wardrobeIsCeilingHeight: boolean;
  wardrobeHideDoors: boolean;
  wardrobeShiftDoors: boolean;
  wardrobeShowInternalBlocks: boolean;
  wardrobeAnalysisResult: string | null;
  wardrobeAnalysisData: FurnitureAnalysisData | null;
  wardrobeCeilingAdjustment: number;
  wardrobeSideShelfLeftEnabled: boolean;
  wardrobeSideShelfLeftWidth: string;
  wardrobeSideShelfLeftCategory: 'internal' | 'external';
  wardrobeSideShelfLeftType: 'shelves' | 'hanging' | 'zigzag' | 'drawers' | 'wine' | 'rounded' | 'glass_display' | 'bag_display' | 'vanity' | 'mirror';
  wardrobeSideShelfLeftSpacing: string;
  wardrobeSideShelfLeftExternalType: string;
  wardrobeSideShelfRightEnabled: boolean;
  wardrobeSideShelfRightWidth: string;
  wardrobeSideShelfRightCategory: 'internal' | 'external';
  wardrobeSideShelfRightType: 'shelves' | 'hanging' | 'zigzag' | 'drawers' | 'wine' | 'rounded' | 'glass_display' | 'bag_display' | 'vanity' | 'mirror';
  wardrobeSideShelfRightSpacing: string;
  wardrobeSideShelfRightExternalType: string;
  wardrobeSideShelfExternalCodes: Record<string, string>;
  wardrobeSideShelfExternalPaths: Record<string, string>;
  wardrobeExternalBaseDir: string;
  wardrobeModelBaseDir: string;
  wardrobeAccordionOpen: boolean;
  wardrobeColorMapPath: string;
  wardrobeBoxColorMapPath: string;
  wardrobeDoorColorMapPath: string;
  wardrobeShelfColorMapPath: string;
  wardrobeSameColor: boolean;
  wardrobeAllSameColor: boolean;
  wardrobeApplyMaterials: boolean;
  wardrobeFullDoors: boolean;
  wardrobeExportFullDoors: boolean;
  wardrobeExportShiftDoors: boolean;
  wardrobeExportView3DLeft: boolean;
  wardrobeExportView3DRight: boolean;
  wardrobeExportViewFront: boolean;
  wardrobeExportViewSideLeft: boolean;
  wardrobeExportViewSideRight: boolean;
  wardrobeExportViewTop: boolean;
  wardrobeColorBrand: 'An Cường' | 'Mộc Phát' | 'Clone 1' | 'Clone 2';
  wardrobeAdvancedFeaturesOpen: boolean;
  // Customer Info
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  exportVersion: number;
}

export interface Preset {
  id: string;
  name: string;
  state: Partial<AppState>;
}
