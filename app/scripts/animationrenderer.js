import {Artwork, Animation} from 'model';
import {ModelUtil} from 'modelutil';


const DEFAULT_LAYER_PROPERTY_STATE = {
  activeBlock: null,
  interpolatedValue: false
};


export class AnimationRenderer {
  constructor(artwork, animation) {
    this.originalArtwork = artwork;
    this.animation = animation;
    this.renderedArtwork = new Artwork(artwork, {linkSelectedState: true});
    this.animDataByLayer = ModelUtil.getOrderedAnimationBlocksByLayerIdAndProperty(animation);

    Object.keys(this.animDataByLayer).forEach(layerId => {
      this.animDataByLayer[layerId] = {
        originalLayer: this.originalArtwork.findLayerById(layerId),
        renderedLayer: this.renderedArtwork.findLayerById(layerId),
        orderedBlocks: this.animDataByLayer[layerId]
      };
    });

    this.setAnimationTime(0);
  }

  setAnimationTime(time) {
    for (let layerId in this.animDataByLayer) {
      let animData = this.animDataByLayer[layerId];
      animData.renderedLayer._ar = animData.renderedLayer._ar || {};

      for (let propertyName in animData.orderedBlocks) {
        let blocks = animData.orderedBlocks[propertyName];
        let _ar = Object.assign({}, DEFAULT_LAYER_PROPERTY_STATE);

        // compute rendered value at given time
        let property = animData.originalLayer.animatableProperties[propertyName];
        let value = animData.originalLayer[propertyName];
        for (let i = 0; i < blocks.length; ++i) {
          let block = blocks[i];
          if (time < block.startTime) {
            break;
          } else if (time < block.endTime) {
            let fromValue = ('fromValue' in block) ? block.fromValue : value;
            let f = (time - block.startTime) / (block.endTime - block.startTime);
            f = block.interpolator.interpolate(f);
            value = property.interpolateValue(fromValue, block.toValue, f);
            _ar.activeBlock = block;
            _ar.interpolatedValue = true;
            break;
          }

          value = block.toValue;
          _ar.activeBlock = block;
        }

        animData.renderedLayer[propertyName] = value;

        // cached data
        animData.renderedLayer._ar[propertyName] = animData.renderedLayer._ar[propertyName] || {};
        animData.renderedLayer._ar[propertyName] = _ar;
      }
    }

    this.animTime = time;
  }

  getLayerPropertyValue(layerId, propertyName) {
    return this.renderedArtwork.findLayerById(layerId)[propertyName];
  }

  getLayerPropertyState(layerId, propertyName) {
    let layerAnimData = this.animDataByLayer[layerId];
    return layerAnimData
        ? layerAnimData.renderedLayer._ar[propertyName] || {}
        : Object.assign({}, DEFAULT_LAYER_PROPERTY_STATE);
  }
}
