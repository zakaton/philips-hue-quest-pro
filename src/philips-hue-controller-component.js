AFRAME.registerSystem("philips-hue-controller", {
  schema: {
    // FILL
  },

  init: function () {
    this.entities = [];
  },

  addEntity: function (entity) {
    this.entities.push(entity);
  },
  removeEntity: function (entity) {
    this.entities.splice(this.entities.indexOf(entity), 1);
  },

  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    if (diffKeys.includes("key")) {
      // FILL
    }
  },

  tick: function (time, timeDelta) {
    this.entities.forEach((entity) => entity.tick(...arguments));
  },
});

AFRAME.registerComponent("philips-hue-controller", {
  schema: {
    philipsHue: { type: "selector", default: "[philips-hue]" },
    width: { type: "number", default: 0.4 },
  },
  _setupCylinderAndSphere: function ({
    cylinderColor,
    sphereColor,
    height,
    type,
  }) {
    const cylinder = document.createElement("a-cylinder");
    const sphere = document.createElement("a-sphere");

    sphere.setAttribute("color", sphereColor);
    sphere.setAttribute("radius", "0.015");
    sphere.setAttribute("position", `0 ${this.data.width / 2} 0`);
    cylinder.appendChild(sphere);

    cylinder.setAttribute("color", cylinderColor);
    cylinder.setAttribute("radius", "0.005");
    cylinder.setAttribute("height", this.data.width);
    cylinder.setAttribute("rotation", "0 0 90");
    cylinder.setAttribute("position", `0 ${height} 0`);

    const leftSphere = document.createElement("a-sphere");
    leftSphere.setAttribute("visible", false);
    leftSphere.setAttribute("radius", "0.015");
    leftSphere.setAttribute("color", "green");
    leftSphere.setAttribute("position", `0 ${this.data.width / 2} 0`);
    cylinder.appendChild(leftSphere);

    const rightSphere = document.createElement("a-sphere");
    rightSphere.setAttribute("visible", false);
    rightSphere.setAttribute("radius", "0.015");
    rightSphere.setAttribute("color", "red");
    rightSphere.setAttribute("position", `0 -${this.data.width / 2} 0`);
    cylinder.appendChild(rightSphere);

    this.el.appendChild(cylinder);

    return {
      cylinder,
      sphere,
      isGrabbing: false,
      sphereWorldPosition: new THREE.Vector3(),
      left: new THREE.Vector3(),
      right: new THREE.Vector3(),
      rightSphere,
      leftSphere,
      line3: new THREE.Line3(),
      closest: new THREE.Vector3(),
      updateLine3() {
        this.leftSphere.object3D.getWorldPosition(this.left);
        this.rightSphere.object3D.getWorldPosition(this.right);
        this.line3.set(this.left, this.right);
      },
      getInterpolation(position) {
        this.updateLine3();
        const closestPoint = this.line3.closestPointToPoint(
          position,
          true,
          this.closest
        );
        this.interpolation =
          closestPoint.distanceTo(this.left) / this.line3.distance();
        return this.interpolation;
      },
      type,
    };
  },
  updatePhilipsHue: function () {
    if (!this.grabbing || !this.data.philipsHue?.components?.["philips-hue"]) {
      return;
    }
    switch (this.grabbing.type) {
      case "hue":
        this.data.philipsHue.components["philips-hue"].setHue(
          this.grabbing.interpolation
        );
        break;
      case "saturation":
        this.data.philipsHue.components["philips-hue"].setSaturation(
          this.grabbing.interpolation
        );
        break;
    }
  },
  init: function () {
    this.philipsHueComponent = this.data.philipsHue.components["philips-hue"];
    this.sliders = {
      hue: this._setupCylinderAndSphere({
        cylinderColor: "black",
        sphereColor: "grey",
        height: "0",
        type: "saturation",
      }),
      saturation: this._setupCylinderAndSphere({
        cylinderColor: "black",
        sphereColor: "grey",
        height: "0.06",
        type: "hue",
      }),
    };
  },
  _setupHandTracking: function () {
    this.handTrackingControls = this.philipsHueComponent.handTrackingControls;
    for (const side in this.handTrackingControls) {
      if (side === "left") {
        continue;
      }

      const handTrackingControls = this.handTrackingControls[side];
      handTrackingControls.addEventListener("pinchstarted", (event) => {
        if (!this.isVisible) {
          return;
        }

        if (!this.grabbing) {
          const { position } = event.detail;
          let closerSlider;
          let shorterDistance = 0.15;
          for (let sliderName in this.sliders) {
            const slider = this.sliders[sliderName];
            const distanceToSlider = slider.sphere.object3D
              .getWorldPosition(slider.sphereWorldPosition)
              .distanceTo(position);
            if (distanceToSlider < shorterDistance) {
              shorterDistance = distanceToSlider;
              closerSlider = slider;
            }
          }
          if (closerSlider) {
            console.log("GRABBING", closerSlider);
            this.grabbing = closerSlider;
            this.side = side;
          }
        }
      });
      handTrackingControls.addEventListener("pinchended", (event) => {
        if (this.grabbing && this.side == side) {
          console.log("RELEASING", this.grabbing);
          this.grabbing = null;
        }
      });
      handTrackingControls.addEventListener("pinchmoved", (event) => {
        if (!this.isVisible) {
          return;
        }
        if (this.grabbing && side == this.side) {
          const { position } = event.detail;
          const interpolation = this.grabbing.getInterpolation(position);
          this.interpolation = interpolation;
          this.updatePhilipsHue();
          this.shouldUpdateSlider = true;
        }
      });
    }
  },
  tick: function () {
    if (!this.handTrackingControls) {
      if (this.philipsHueComponent.handTrackingControls?.right) {
        this._setupHandTracking();
      }
    } else {
      if (this.isVisible) {
        if (this.grabbing && this.shouldUpdateSlider) {
          const y = THREE.MathUtils.lerp(
            this.data.width / 2,
            -this.data.width / 2,
            this.interpolation
          );
          this.grabbing.sphere.object3D.position.y = y;
          this.shouldUpdateSlider = false;
        }
      }
    }
  },
  onIsCloseUpdate: function () {},
  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    if (diffKeys.includes("key")) {
      // FILL
    }
  },
  remove: function () {
    this.system.removeEntity(this);
  },
});
