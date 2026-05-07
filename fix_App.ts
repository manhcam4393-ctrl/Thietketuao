import fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldCall = `generateWardrobeAnalysisText(newData, length, height, depth, numWings, state.wardrobeHasTopBlock, state.wardrobeIsCeilingHeight, state.wardrobeCeilingAdjustment)`;
const newCall = `generateWardrobeAnalysisText(
      newData, length, height, depth, numWings, state.wardrobeHasTopBlock, state.wardrobeIsCeilingHeight, state.wardrobeCeilingAdjustment,
      state.wardrobeSideShelfLeftEnabled, parseInt(state.wardrobeSideShelfLeftWidth) || 0, state.wardrobeSideShelfLeftCategory, state.wardrobeSideShelfLeftType, state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfRightEnabled, parseInt(state.wardrobeSideShelfRightWidth) || 0, state.wardrobeSideShelfRightCategory, state.wardrobeSideShelfRightType, state.wardrobeSideShelfRightExternalType
    )`;

content = content.split(oldCall).join(newCall);

fs.writeFileSync(filePath, content);
console.log('Fixed all calls in App.tsx');
