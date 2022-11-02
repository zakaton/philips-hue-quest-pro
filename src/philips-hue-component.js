AFRAME.registerSystem("philips-hue", {
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

AFRAME.registerComponent("philips-hue", {
  schema: {
    ip: { type: "string" },
    username: { type: "string" },
    index: { type: "number", default: 1 },
    distanceThreshold: { type: "number", default: 1 },
    controller: { type: "selector", default: "[philips-hue-controller]" },
  },
  init: async function () {
    this.system.addEntity(this);
    console.log(this.data);
    this.philipsHue = new PhilipsHue(
      this.data.ip,
      this.data.username,
      this.data.index
    );
    this.information = await this.philipsHue.getInformation();
    console.log(this.information);
    this.textEntity = document.createElement("a-text");
    this.textEntity.setAttribute("value", this.information.name);
    this.textEntity.setAttribute("color", "black");
    this.textEntity.setAttribute("align", "center");
    this.textEntity.setAttribute("position", "0 0.5 0");
    this.el.appendChild(this.textEntity);

    this.sphereEntity = document.createElement("a-sphere");
    this.sphereEntity.setAttribute("color", "yellow");
    this.sphereEntity.setAttribute("radius", "0.2");
    this.sphereEntity.setAttribute("data-raycastable", "");
    this.sphereEntity.setAttribute("visible", "false");
    this.el.appendChild(this.sphereEntity);

    this.newPosition = new THREE.Vector3();
    this.fingerTipPositions = {
      index: new THREE.Vector3(),
      thumb: new THREE.Vector3(),
      getDistance() {
        return this.index.distanceTo(this.thumb);
      },
    };
    this.leftHandPosition = new THREE.Vector3();

    this.cameraEntity = this.el.sceneEl.querySelector("a-camera");

    const events = [
      "setEnabled",
      "setBrightness",
      "setTemperature",
      "setSaturation",
      "setHue",
      "setColorRGB",
      "setColorHex",
    ];
    events.forEach((type) => {
      this[type] = AFRAME.utils.throttle(
        (...args) => this.philipsHue[type](...args),
        1000 / 10
      );
    });

    this.el.addEventListener("mouseenter", (event) => {
      this.data.controller.setAttribute("visible", true);
      this.data.controller.components[
        "philips-hue-controller"
      ].isVisible = true;
    });
    this.el.addEventListener("mouseleave", (event) => {
      this.data.controller.setAttribute("visible", false);
      this.data.controller.components[
        "philips-hue-controller"
      ].isVisible = false;
    });

    this.handTrackingControls = {};
    this.el.sceneEl
      .querySelectorAll("[hand-tracking-controls]")
      .forEach((handTrackingControls) => {
        this.handTrackingControls[
          handTrackingControls.components["hand-tracking-controls"].data.hand
        ] = handTrackingControls;
      });

    this.grab = {
      isGrabbing: false,
      side: null,
    };
    this.jointAPI = {};
    for (const side in this.handTrackingControls) {
      const handTrackingControls = this.handTrackingControls[side];
      handTrackingControls.addEventListener(
        "hand-tracking-extras-ready",
        (event) => {
          const { jointAPI } = event.detail.data;
          this.jointAPI[side] = jointAPI;
        }
      );
      handTrackingControls.addEventListener("pinchstarted", (event) => {
        if (!this.grab.isGrabbing) {
          const { position } = event.detail;
          const distanceToEntity =
            this.el.object3D.position.distanceTo(position);
          if (distanceToEntity < 0.6) {
            this.grab.isGrabbing = true;
            this.grab.side = side;
          }
        }
      });
      handTrackingControls.addEventListener("pinchended", (event) => {
        if (this.grab.isGrabbing && side == this.grab.side) {
          this.grab.isGrabbing = false;
        }
      });
      handTrackingControls.addEventListener("pinchmoved", (event) => {
        if (this.grab.isGrabbing && side == this.grab.side) {
          const { position } = event.detail;
          this.newPosition.copy(position);
          this.newPosition.y -= 0.5;
          this.shouldUpdatePosition = true;
        }
      });
    }
  },
  tick: function () {
    if (this.cameraEntity?.object3D) {
      const distanceToCamera = this.el.object3D.position.distanceTo(
        this.cameraEntity.object3D.position
      );
      const isClose = distanceToCamera < this.data.distanceThreshold;
      if (this.isClose != isClose) {
        this.isClose = isClose;
        this.onIsCloseUpdate();
      }
    }
    if (this.shouldUpdatePosition) {
      this.shouldUpdatePosition = false;
      this.el.object3D.position.copy(this.newPosition);
    }
    if (
      !this.isClose &&
      this.cameraEntity?.object3D &&
      this.handTrackingControls?.left?.components["hand-tracking-controls"]
        ?.mesh?.visible
    ) {
      const jointAPI = this.jointAPI?.left;
      const handDistanceToCamera =
        this.cameraEntity.object3D.position.distanceTo(
          jointAPI.getWrist().getPosition()
        );
      if (handDistanceToCamera < 0.5) {
        jointAPI.getIndexTip().getPosition(this.fingerTipPositions.index);
        jointAPI.getThumbTip().getPosition(this.fingerTipPositions.thumb);
        const distanceBetweenFingers = this.fingerTipPositions.getDistance();
        let brightness = THREE.MathUtils.inverseLerp(
          0.02,
          0.09,
          distanceBetweenFingers
        );
        brightness = THREE.MathUtils.clamp(brightness, 0, 1);
        this.setBrightness(brightness);
      }
    }
  },
  onIsCloseUpdate: function () {
    this.sphereEntity.setAttribute("visible", this.isClose);
  },
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
