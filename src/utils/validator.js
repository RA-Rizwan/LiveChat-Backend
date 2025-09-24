import validator from "validator";

export const signupValidate = (req) => {
    const { firstName, lastName, emailId, password } = req.body
    
    if (firstName == "" || lastName == "") {
        throw new Error("Please enter both First and Last name");      
    }
    else if(!validator.isEmail(emailId)){
throw new Error("Enter valid email");
    }
    else if(!validator.isStrongPassword(password)){
        throw new Error("Please enter strong password");
        
    }
}



export const loginValidate = (req) => {
    const { emailId, password } = req.body;
     if (emailId == "" || password == "") {
          throw new Error("please enter email and password correctly");
        }
        if (!validator.isEmail(emailId)) {
          throw new Error("Enter a valid email");
          
        }
}

export const validateProfileEdit = (req) => {
    const allowedEdit = ["firstName", "lastName", "photoUrl", "about", "skills","gender","age"]
    const isEditAllowed = Object.keys(req.body).every(feild => allowedEdit.includes(feild))
    return isEditAllowed;
}


export const validateUpdatePass = (req) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
        if (!currentPassword || !newPassword || !confirmPassword) {
          throw new Error("All fields are required");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (!validator.isStrongPassword(newPassword)) {
          throw new Error("Password must be ≥8 chars and include lowercase, uppercase, digit, and special character.");
        }
}