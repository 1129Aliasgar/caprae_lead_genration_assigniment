/**
 * @author aliasgarbootwala@gmail.com
 *
 * Import for the side effect of registering controllers.
 *
 * `inversify-express-utils` registers a controller's routes when its module is
 * evaluated, so this file is the router registry — there is no separate route
 * layer to configure. Order matters: literal paths must be declared before
 * parameterised ones, which is why the recommendation controller's `/feedback`
 * route is safe despite `GET /:leadId` existing in the same class.
 */

import "./auth.controller.js";
import "./recommendation.controller.js";