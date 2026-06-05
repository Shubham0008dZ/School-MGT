const { createClient } = require('@supabase/supabase-js');

// TODO: Yahan apni Supabase details daal
const supabaseUrl = 'TERA_SUPABASE_PROJECT_URL_YAHAN_DAAL';
const supabaseKey = 'TERI_SUPABASE_ANON_KEY_YAHAN_DAAL';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
    // Sirf POST request allow karenge (jaise Google Sheet me karte the)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const action = payload.action;

        // 1. FETCH EMPLOYEES (Data laane ke liye)
        if (!action || action === "getEmployees") {
            const { data, error } = await supabase
                .from('Employee_Data')
                .select('*')
                .order('id', { ascending: true });
                
            if (error) throw error;
            return res.status(200).json({ status: "Success", employees: data });
        }

        // 2. SAVE NEW EMPLOYEE
        if (action === "saveEmployee") {
            payload.data.Status = payload.data.Status || "Active";
            payload.data.school_code = payload.data.school_code || "VPS"; 

            const { data, error } = await supabase
                .from('Employee_Data')
                .insert([payload.data]);

            if (error) throw error;
            return res.status(200).json({ status: "Success", message: "Employee Added Successfully!" });
        }

        // 3. UPDATE EMPLOYEE
        if (action === "updateEmployee") {
            const { data, error } = await supabase
                .from('Employee_Data')
                .update(payload.data)
                .eq('empId', payload.data.empId);

            if (error) throw error;
            return res.status(200).json({ status: "Success", message: "Employee Updated Successfully!" });
        }

        // 4. MARK INACTIVE
        if (action === "inactiveEmployee") {
            const { data, error } = await supabase
                .from('Employee_Data')
                .update({ Status: 'Inactive', LeaveReason: payload.reason + " | " + payload.date })
                .eq('empId', payload.empId);

            if (error) throw error;
            return res.status(200).json({ status: "Success", message: "Employee Marked Inactive!" });
        }

        return res.status(400).json({ status: "Error", message: "Invalid Action" });

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ status: "Error", message: error.message });
    }
};
