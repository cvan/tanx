pc.script.create('client', function (context) {

    var Client = function (entity) {
        this.entity = entity;
        this.id = null;
        this.movement = [ 0, 0 ];
        context.keyboard = new pc.input.Keyboard(document.body);
    };

    Client.prototype = {
        initialize: function () {
            this.tanks = context.root.getChildren()[0].script.tanks;
            this.bullets = context.root.getChildren()[0].script.bullets;

            var self = this;
            var socket = this.socket = new m.net.ws({ url: 'wss://tanx.playcanvas.com/' });

            socket.on('init', function(data) {
                self.id = data.id;
            });

            socket.on('tank.new', function(data) {
                self.tanks.new(data);
            });

            socket.on('tank.delete', function(data) {
                self.tanks.delete(data);
            });

            socket.on('update', function(data) {
                self.tanks.updateData(data.tanks);

                var i = 0;

                if (data.tanksRespawn) {
                    i = data.tanksRespawn.length;
                    while(i--) {
                        self.tanks.respawn(data.tanksRespawn[i]);
                    }
                }

                if (data.bulletsDelete) {
                    i = data.bulletsDelete.length;
                    while(i--) {
                        self.bullets.delete(data.bulletsDelete[i]);
                    }
                }
            });

            socket.on('bullet.new', function(data) {
                self.bullets.new(data);
            });

            context.mouse.on('mousedown', this.onMouseDown, this);
            context.mouse.on('mouseup', this.onMouseUp, this);

            this.mouseState = false;
        },

        update: function (dt) {
            // collect keyboard input
            var movement = [
                context.keyboard.isPressed(pc.input.KEY_D) - context.keyboard.isPressed(pc.input.KEY_A),
                context.keyboard.isPressed(pc.input.KEY_S) - context.keyboard.isPressed(pc.input.KEY_W)
            ];

            // sum in gamepad axis
            movement[0] += context.gamepads.getAxis(pc.PAD_1, pc.PAD_L_STICK_X);
            movement[1] += context.gamepads.getAxis(pc.PAD_1, pc.PAD_L_STICK_Y);


            // determine firing state
            var gpx = context.gamepads.getAxis(pc.PAD_1, pc.PAD_R_STICK_X);
            var gpy = context.gamepads.getAxis(pc.PAD_1, pc.PAD_R_STICK_Y);

            if (gpx * gpx + gpy * gpy > .25 && this) {
              this.shoot(true);
              this.gpShot = true;
            } else {
              if (this.gpShot) {
                this.shoot(false);
                this.gpShot = false;
              }
            }

            // rotate vector
            var t =       movement[0] * Math.sin(Math.PI * 0.75) - movement[1] * Math.cos(Math.PI * 0.75);
            movement[1] = movement[1] * Math.sin(Math.PI * 0.75) + movement[0] * Math.cos(Math.PI * 0.75);
            movement[0] = t;

            // check if it is changed
            if (movement[0] !== this.movement[0] || movement[1] != this.movement[1]) {
                this.movement = movement;
                this.socket.send('move', this.movement);
            }
        },

        onMouseDown: function() {
            this.shoot(true);
        },

        onMouseUp: function() {
            this.shoot(false);
        },

        shoot: function(state) {
            if (this.shootingState !== state) {
                this.shootingState = state;

                this.socket.send('shoot', this.shootingState);
            }
        }
    };

    return Client;
});
