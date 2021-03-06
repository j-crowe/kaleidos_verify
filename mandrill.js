var  mandrill= (function(){
    // Currently accepted verification types and their associated regex + error
    var types = {   "email": {
                                "error": "Please enter valid email",
                                "regex":/^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/
                            },
                    "required": {
                                "error":"This field is required",
                                "regex":/\S/
                            },
                    "min": {
                                "error": "Too short. Minimum length of ",
                                "regex":/^min\:\s*(\d*)/i
                            },
                    "max": {
                                "error": "Too Long. Maximum length of ",
                                "regex":/^max\:\s*(\d*)/i
                            },
                    "number": {
                                "error": "Not a number value",
                                "regex":/^-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/
                            },
                    "integer": {
                                "error": "not an integer value",
                                "regex":/^-?\d+$/
                            },
                    "digits": {
                                "error": "not a digit value",
                                "regex":/^\d+$/
                            },
                    "url": {
                                "error": "Invalid URL",
                                "regex":/^https?:\/\/[\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[\-A-Za-z0-9+&@#\/%=~_|]/
                            },
                    "alphanumeric": {
                                "error": "Only use numbers and letters",
                                "regex":/^[0-9A-Za-z]+$/
                            }

    };
    var variable_types = ["min", "max"];
    var mandrill_error= "Manrdrill: Error - ", mandrill_warning= "Mandrill: Warning - ", mandrill_status = "Mandrill: ";
    var exist = mandrill_error + "Verification type does not exist: ";

    return {

        /*****************************************************************************************
         * FLOW     Called by verify_fields to check the regex of accepted verification types
         * INPUT    Input to be verified, and the type of verification object. SEE ABOVE IN TYPES
         * RETURNS  returns either "true" or a error message
         * NOTES    This is the bulk of the functionality in this switch. Most generic error handling
         *          and data prep is done outside this function however
         ****************************************************************************************/
        check_types: function(verify_input, type){
            var temp_type = mandrill.verify_variable_attribute(type);
            var variable_type = undefined;
            if (temp_type != undefined){
                variable_type = type;
                type = temp_type;
            }
            switch(type){
                case "max":
                    var status = true;
                    var max = parseInt(types[type]["regex"].exec(variable_type)[1]);
                    var length = verify_input.length;
                    if(isNaN(max)== true){
                        console.log(mandrill_error+"Invalid max value, NaN: " + temp_type)
                    }else if(length > max){
                        status = types[type]["error"] + max;
                    }
                    return status;
                case "min":
                    var status = true;
                    var min = parseInt(types[type]["regex"].exec(variable_type)[1]);
                    var length = verify_input.length;
                    if(isNaN(min)== true){
                        console.log(mandrill_error+"Invalid max value, NaN: " + temp_type)
                    }else if(length < min){
                        status = types[type]["error"] + min;
                    }
                    return status;
                default:
                    var status = types[type]["regex"].test(verify_input);
                    if(status === false){status = types[type]["error"];}
                    return status;
            }
        },

        /*****************************************************************************************
             * FLOW     Called by verify_attribute and check_types. Used to return type of variability param
             * INPUT    Attribute to be checked for variability param.
             * RETURNS  returns the type of veriability param or "undefined"
             * @example Given "max: 25", this function will return "max" as the type
             ****************************************************************************************/
            verify_variable_attribute: function(attribute){
                var type = undefined;
                if(attribute.match(/min/i)){
                    type = "min";
                }else if(attribute.match(/max/i)){
                    type = "max";
                }
                return type;
            },
            /*****************************************************************************************
             * FLOW     Called by verify_field for basic error checking. Length and existance of attribute
             * INPUT    Attributes to be verified. Checks for existance and non-empty SEE ABOVE IN TYPES
             * RETURNS  returns verify_status object with a boolean status, required field flag, and trim flag
             ****************************************************************************************/
            verify_attributes: function(attributes){
            // Check if attributes exist when calling
            if(attributes.length === 0){
                console.log(mandrill_error+"No attributes assigned to 'data-verify'");
                return false;
            }
            var required=false, trim=false;
            for(i = 0; i < attributes.length; ++i){
                var type = attributes[i].trim();
                if(mandrill.verify_variable_attribute(type) == undefined && types[type] == undefined){
                    console.log(exist + type);
                    return {"success": false, "required": required, "trim": trim};
                }
                // Check if verify attribute is required or trim and set flags
                if(type === "required"){required = true;}
                else if( type === "trim"){trim = true;}

            }
            return {"success": true, "required": required, "trim": trim};
        },
        /*****************************************************************************************
         * FLOW     Called by verify_field for basic error checking. Length and existance of attribute
         * INPUT    Attributes to be verified. Checks for existance and non-empty SEE ABOVE IN TYPES
         * RETURNS  returns either "true" or "false" depending on verification
         ****************************************************************************************/
        verify_field: function(input){
            var verify_object = $(input);
            var verify_input = verify_object.val();
            var verification_type = verify_object.data('verify');
            var attributes = verification_type.split(',');

            // Check base cases and return false if invalid
            var attr_status = mandrill.verify_attributes(attributes);
            if(attr_status.success === false){
                return false;
            // If the field is not marked as required and there is no input, return success
            }else if(attr_status.required === false && verify_input.length === 0){
                return true;
            // If trim flag is set, trim the field input so allow verification to ignore whitespace
            }else if(attr_status.trim === true){
                verify_input.trim();
            }
            // For every attribute in data-verify do associated verification
            for(i = 0; i < attributes.length; ++i){
                type = attributes[i].trim();
                var verify_status = mandrill.check_types(verify_input, type)
                if(verify_status != true){
                    return verify_status;
                }
            }
            return true;
        },
        /*****************************************************************************************
         * FLOW     Called by the verify or single_verify to handle and display errors
         * INPUT    The element and status to display in case of error
         * RETURNS  true if verified or false if error displayed
         ****************************************************************************************/
        error_check: function(element, status){
            if(status != true){
                $(element).notify(status);
                return false;
            }
            return true;
        },
        /*****************************************************************************************
         * FLOW     ENTRY POINT
         * INPUT    The parent continer with items to be varified
         * RETURNS  true or false and error status
         * NOTE     This function is the root of most work, it calls children to error check then
         *          verify the content of the fields
         ****************************************************************************************/
        verify: function(parent, callback){
            var verified = true;
            var verification_status = "";
            var last_element = undefined;
            var verify_field_count = 0;

            // look at each child of the parent element passed in
            parent.find('[data-verify]').each(function() {
                verify_field_count++;
                last_element = this;
                // Call verification on each element
                verification_status = mandrill.verify_field(this);
                // If an error is returned, set verified to false and halt each function
                if(verification_status != mandrill.error_check(this, verification_status)){
                    verified = false;
                }
            });
            // Check the number of verify fields to see if user may have made a mistake in verifying
            if(verify_field_count === 0){
                console.log(mandrill_warning + "No verify fields found. Empty or incorrect parent container")
            }

            //--------------------check verification_status---------------------//

            // Successful verification process results in callback called
            if(verified === true){
                // Check callback and apply arbitrary amount of arguments
                if(typeof callback === 'function'){
                    callback.apply(arguments);
                }
                return true;
            // Failed verification process results in first error being displayed
            }else{
                // TODO: do notify of error
                console.log(mandrill_status + verification_status);
                return false;
            }
        },
        /*****************************************************************************************
         * TAG      ENTRY POINT
         * FLOW     Entry point into mandrill.js on a single element
         * INPUT    Element to be verified. SEE ABOVE IN TYPES
         * RETURNS  returns either "true" or "false" depending on verification and handles notifyjs
         ****************************************************************************************/
        single_verify: function(element){
            var status = mandrill.verify_field(element);
            return mandrill.error_check(element, status);
        }
    }
})();
