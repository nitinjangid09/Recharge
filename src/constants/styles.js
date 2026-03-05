import { StyleSheet, } from "react-native";
import { container, form, input, inputContainer, label } from "../componets/Utils/theme";

export default styles = StyleSheet.create({
    container: {
        flex: container.flex,
        backgroundColor: container.backgroundColor,
    },
    inputContainer: {
        padding: inputContainer.padding,
        backgroundColor: inputContainer.backgroundColor,
        marginBottom: inputContainer.marginBottom,
    },
    label: {
        fontSize: label.fontSize,
        color: label.color,
        marginBottom:label.marginBottom,
    },
    input: {
        height: input.height,
        borderBottomWidth: input.borderBottomWidth,
        borderBottomColor: input.borderBottomColor,
        paddingHorizontal: input.paddingHorizontal,
        marginBottom: input.marginBottom,
    },
    operatorSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    operatorInfo: {
        fontSize: 14,
        color: '#666',
    },
    changeOperator: {
        fontSize: 14,
        color: '#007AFF',
    },
    searchSection: {
        padding: 15,
        backgroundColor: '#FFF',
    },
    searchInput: {
        height: 40,
        borderBottomWidth: 1,
        borderBottomColor: 'gray',
        paddingHorizontal: 10,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
        paddingVertical: 10,
        
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        left:10
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    listContainer: {
        padding: 15,
    },
    form: {
        backgroundColor: form.backgroundColor,
        borderRadius: form.borderRadius,
        padding: form.padding,
        marginBottom: form.marginBottom,
        shadowColor: form.shadowColor,
        shadowOpacity:form.shadowOpacity,
        shadowRadius: form.shadowRadius,
        shadowOffset: form.shadowOffset,
        elevation: form.elevation,
    },
    planLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 5,
    },
    planDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    planPrice: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    planData: {
        fontSize: 14,
        color: '#333',
    },
    planValidity: {
        fontSize: 14,
        color: '#666',
    },
    viewDetails: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
    },
});

