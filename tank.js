var tmpVec = new pc.Vec3();
var tmpQuat = new pc.Quat();

var slerp = function (lhs, rhs, alpha) {
    var q1x, q1y, q1z, q1w, q2x, q2y, q2z, q2w,
        omega, cosOmega, invSinOmega, flip, beta;

    q1x = lhs.x;
    q1y = lhs.y;
    q1z = lhs.z;
    q1w = lhs.w;

    q2x = rhs.x;
    q2y = rhs.y;
    q2z = rhs.z;
    q2w = rhs.w;

    cosOmega = q1x * q2x + q1y * q2y + q1z * q2z + q1w * q2w;

    // If B is on opposite hemisphere from A, use -B instead
    flip = cosOmega < 0;
    if (flip) {
        cosOmega *= -1;
    }

    // Complementary interpolation parameter
    beta = 1 - alpha;

    if (cosOmega < 1) {
        omega = Math.acos(cosOmega);
        invSinOmega = 1 / Math.sin(omega);

        beta = Math.sin(omega * beta) * invSinOmega;
        alpha = Math.sin(omega * alpha) * invSinOmega;

        if (flip) {
            alpha = -alpha;
        }
    }

    this.x = beta * q1x + alpha * q2x;
    this.y = beta * q1y + alpha * q2y;
    this.z = beta * q1z + alpha * q2z;
    this.w = beta * q1w + alpha * q2w;

    return this;
};

pc.script.create('tank', function (context) {
    var matBase = null;
    var matTracks = null;
    var matBullet = null;
    
    var Tank = function (entity) {
        this.entity = entity;
        this.entity.angle = this.angle.bind(this);
        this.entity.targeting = this.targeting.bind(this);
        this.entity.setColor = this.setColor.bind(this);
        
        this.movePoint = new pc.Vec3();
        this.targetPoint = new pc.Quat();
        
        this.matBase = null;
        this.matBullet = null;
        this.matTracks = null;
        this.head = null;
        this.hpBar = null;
        
        this.hp = 0;
    };

    Tank.prototype = {
        initialize: function () {
            // find head
            this.head = this.entity.findByName('head');
            
            // find hpBar
            this.hpBar = this.head.findByName('hp');
            this.hpBarLeft = this.hpBar.findByName('left');
            this.hpBarRight = this.hpBar.findByName('right');
            
            // find light
            this.light = this.entity.findByName('light');
            
            // shadow
            this.shadow = this.entity.findByName('shadow');
            
            // clone material
            if (matBase == null) {
                matBase = context.assets.find('tank').resource;
                matTracks = context.assets.find('tracks').resource;
                matBullet = context.assets.find('bullet').resource;
            }
            
            // console.log(asset);
            this.matBase = matBase.clone();
            this.matTracks = matTracks.clone();
            this.matBullet = matBullet.clone();
            
            this.tracksOffset = 0;
            
            // set white color for material
            this.matBase.emissive.set(0, 0, 0, 1);
            this.matBase.update();
            
            this.matTracks.emissive.set(0, 0, 0, 1);
            this.matTracks.update();
            
            this.matBullet.emissive.set(0, 0, 0, 1);
            this.matBullet.update();
            
            this.blinkParts = this.entity.findByLabel('sub-part');
            
            // put new material on each sub-part
            this.blinkParts.forEach(function(entity) {
                var meshes = entity.model.model.meshInstances;
                for(var i = 0; i < meshes.length; i++) {
                    if (meshes[i].node.name === 'Caterpillar') {
                        meshes[i].material = this.matTracks;
                    } else {
                        meshes[i].material = this.matBase;
                    }
                }
            }.bind(this));
            
            // add shadow to blinkParts
            this.blinkParts.push(this.shadow);

            this.entity.fire('ready');
            
            this.movePoint.copy(this.entity.getPosition());
            
            this.respawned = Date.now();
            this.flashState = false;
            
            if (('tank_' + context.root.getChildren()[0].script.client.id) !== this.entity.name) {
                this.light.destroy();
            } else {
                this.light.enabled = true;
            }
        },

        update: function (dt) {
            // rotation
            tmpVec.copy(this.entity.getPosition());
            var len = tmpVec.sub(this.movePoint).length();
            if (len > 0.2) {
                var angle = Math.floor(Math.atan2(this.entity.getPosition().x - this.movePoint.x, this.entity.getPosition().z - this.movePoint.z) / (Math.PI / 180));
                tmpQuat.setFromEulerAngles(0, angle + 180, 0);
                slerp.call(tmpQuat, this.entity.getRotation(), tmpQuat, 0.15);
                this.entity.setRotation(tmpQuat);
            }
            
            // movement
            tmpVec.lerp(this.entity.getPosition(), this.movePoint, 0.1);
            this.entity.setPosition(tmpVec);
            
            // this.matTracks
            if (len > 0.05) {
                this.tracksOffset = (this.tracksOffset + Math.min(1, len)) % 4;
                // emissive
                this.matTracks.emissiveMapOffset.set(0, this.tracksOffset / 4);
                this.matTracks.emissiveMapOffset[0] = this.matTracks.emissiveMapOffset.x;
                this.matTracks.emissiveMapOffset[1] = this.matTracks.emissiveMapOffset.y;
                this.matTracks.setParameter('material_emissiveMapOffset', this.matTracks.emissiveMapOffset);
                
                this.matTracks.glossMapOffset.set(0, this.tracksOffset / 4);
                this.matTracks.glossMapOffset[0] = this.matTracks.glossMapOffset.x;
                this.matTracks.glossMapOffset[1] = this.matTracks.glossMapOffset.y;
                this.matTracks.setParameter('material_glossMapOffset', this.matTracks.glossMapOffset);
            }
            
            // targeting
            slerp.call(tmpQuat, this.head.getRotation(), this.targetPoint, 0.3);
            this.head.setRotation(tmpQuat);
            
            // hp bar
            this.hpBar.setRotation(0, 0, 0, 1);
            this.hpBar.rotate(0, 45, 0);
            
            if (Date.now() - this.respawned < 1000) {
                var state = (Math.floor((Date.now() - this.respawned) / 100) % 2) == 1;
                if (this.flashState !== state) {
                    this.flashState = state;
                    
                    for(var i = 0; i < this.blinkParts.length; i++) {
                        this.blinkParts[i].model.enabled = state;
                    }
                }
            } else if (! this.flashState) {
                this.flashState = true;
                
                for(var i = 0; i < this.blinkParts.length; i++) {
                    this.blinkParts[i].model.enabled = true;
                }
            }
        },
        
        setColor: function(color) {
            if (this.matBase.emissive.r !== color[0] || this.matBase.emissive.g !== color[1] || this.matBase.emissive.b !== color[2]) {
                this.matBase.emissive.set(color[0], color[1], color[2], 1);
                this.matBase.update();
                
                this.matTracks.emissive.set(color[0], color[1], color[2], 1);
                this.matTracks.update();
                
                this.matBullet.emissive.set(color[0], color[1], color[2], 1);
                this.matBullet.update();
                
                if (this.light.enabled) {
                    this.light.light.color.set(color[0], color[1], color[2], 1);
                    this.light.light.refreshProperties();
                }
            }
        },
        
        setHP: function(hp) {
            if (this.hp == hp) return;
            
            if (this.hp > hp) {
                this.entity.audiosource.play('tank_hit');
                this.entity.audiosource.pitch = Math.random() * 0.6 - 0.3 + 1.0;
                if (this.own && window.navigator.vibrate) {
                    window.navigator.vibrate(30 + Math.floor(Math.random() * 40));
                }
            }
            this.hp = hp;
            
            var left = Math.min(10, hp / 10);
            this.hpBarLeft.setLocalScale(left, 0.1, 0.1);
            this.hpBarLeft.setLocalPosition(-Math.max(0.01, 1 - left) / 2, 0, 0);
            this.hpBarRight.setLocalScale(Math.max(0.01, 1 - left), 0.1, 0.1);
            this.hpBarRight.setLocalPosition(left / 2, 0, 0);
        },
        
        angle: function(angle) {
            this.entity.setRotation(this.entity.getRotation().setFromEulerAngles(0, angle, 0));
        },
        
        targeting: function(angle) {
            this.targetPoint.setFromEulerAngles(0, angle, 0);
        },
        
        moveTo: function(pos) {
            this.movePoint.set(pos[0], 0, pos[1]);
        }
    };

    return Tank;
});